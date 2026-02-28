/**
 * prediction-ui.js — Prediction Tab UI Renderer
 * Renders clinical prediction cards with Chart.js visualizations,
 * narrative summaries, and confidence transparency.
 *
 * v1.1.0 — Progressive streaming, cohort quality, KM survival curves,
 *           drug comparisons, outcome validation, role-based views,
 *           per-model versioning/validation, offline fallback.
 *
 * @requires Chart.js 3.9.1 (already loaded in index.html)
 * @requires prediction-engine.js (PredictionEngine, PredictionDataPrep)
 * @version 1.1.0
 */

(function() {
  'use strict';

  // Chart instance registry for cleanup
  var _predictionCharts = {};
  var _currentViewRole = 'physician'; // 'physician' or 'cho'

  /**
   * Main entry point — Render the Predictions tab content.
   * Uses streaming mode: renders each model card progressively as it arrives.
   *
   * @param {HTMLElement} container - The #predictionsContainer element
   * @param {Object} patient - Normalized patient data
   * @param {Array} followUps - Patient follow-ups (newest-first from caller; we reverse for chronological)
   */
  window.renderPredictionsTab = function(container, patient, followUps) {
    if (!container) return;

    // Destroy any existing prediction charts
    _destroyAllPredictionCharts();

    // Reverse to chronological order (oldest first) if needed
    var chronoFollowUps = (followUps || []).slice();
    if (chronoFollowUps.length >= 2) {
      var first = _parseDateSafe(chronoFollowUps[0].FollowUpDate || chronoFollowUps[0].followUpDate);
      var last = _parseDateSafe(chronoFollowUps[chronoFollowUps.length - 1].FollowUpDate || chronoFollowUps[chronoFollowUps.length - 1].followUpDate);
      if (first && last && first > last) {
        chronoFollowUps.reverse();
      }
    }

    // Store references for retry / offline
    window._lastPredictionPatient = patient;
    window._lastPredictionFollowUps = chronoFollowUps;

    // Detect role
    var detectedRole = _detectUserRole();
    _currentViewRole = detectedRole === 'phc' ? 'cho' : 'physician';

    // Check data sufficiency (per-model)
    var sufficiency = window.PredictionEngine.checkDataSufficiency(chronoFollowUps);
    if (!sufficiency.sufficient) {
      container.innerHTML = _renderInsufficientData(sufficiency, patient);
      return;
    }

    // Show loading skeleton with instant local stats
    container.innerHTML = _renderLoadingSkeleton(patient, chronoFollowUps);

    // Check if online
    var isOnline = navigator.onLine !== false && typeof window.makeAPICall === 'function';

    if (!isOnline) {
      // Offline fallback
      var offlineResult = window.PredictionEngine.generateOfflinePredictions(patient, chronoFollowUps);
      container.innerHTML = _renderFullPredictions(offlineResult, patient, chronoFollowUps);
      _initializePredictionCharts(offlineResult, chronoFollowUps);
      _initializeExpandCollapse(container);
      return;
    }

    var patientId = patient.ID || patient.id || '';

    // Use streaming mode: fetch each model in parallel, render progressively
    window.PredictionEngine.fetchPredictionsStreaming(patientId, {
      role: _currentViewRole === 'cho' ? 'phc' : '',
      onModel: function(modelName, data, error) {
        // Progressive update: replace skeleton card for this model
        var placeholder = document.getElementById('pred-card-' + modelName);
        if (placeholder && data && data.predictions && data.predictions[modelName]) {
          var pred = data.predictions[modelName];
          var validation = (data.validation && data.validation[modelName]) || null;
          var version = (data.modelVersions && data.modelVersions[modelName]) || null;
          placeholder.outerHTML = _renderSingleModelCard(modelName, pred, validation, version);
        } else if (placeholder && error) {
          placeholder.outerHTML = '<div class="prediction-section prediction-section-muted"><h4 class="prediction-section-title">' + _formatModelName(modelName) + '</h4><p class="prediction-narrative">⚠ ' + _esc(error.message || 'Model unavailable') + '</p></div>';
        }
      },
      onComplete: function(fullResult) {
        // Once all models are done, add supplementary sections
        _appendSupplementarySections(container, fullResult, patient, chronoFollowUps);
        _initializePredictionCharts(fullResult, chronoFollowUps);
        _initializeExpandCollapse(container);
      }
    }).catch(function(err) {
      console.error('Prediction streaming failed:', err);
      // Fallback: try offline predictions
      var offlineResult = window.PredictionEngine.generateOfflinePredictions(patient, chronoFollowUps);
      container.innerHTML = _renderFullPredictions(offlineResult, patient, chronoFollowUps);
      _initializePredictionCharts(offlineResult, chronoFollowUps);
      _initializeExpandCollapse(container);
    });
  };

  // ──────────────────────────────────────────────────────────────────
  // §1  Full Prediction Renderer
  // ──────────────────────────────────────────────────────────────────

  function _renderFullPredictions(result, patient, followUps) {
    var pred = result.predictions;
    var meta = result.metadata || {};
    var isOffline = result.offline === true;
    var html = '';

    // ── Header ──
    html += '<div class="prediction-main-header">';
    html += '<div class="prediction-title-row">';
    html += '<h3 class="prediction-main-title"><span class="prediction-icon">&#x1F9E0;</span> Clinical Predictions</h3>';
    html += '<div class="prediction-meta-badges">';
    if (isOffline) {
      html += '<span class="prediction-badge prediction-badge-warning">&#x1F4F4; Offline Estimate</span>';
    }
    html += '<span class="prediction-badge prediction-badge-info">v' + _esc(result.modelVersion || '1.1.0') + '</span>';
    html += '<span class="prediction-badge prediction-badge-info">Cohort: ' + (meta.cohortSize || '—') + '</span>';
    html += '<span class="prediction-badge prediction-badge-muted">' + _formatTimestamp(result.generatedAt) + '</span>';
    if (meta.computeTimeMs) {
      html += '<span class="prediction-badge prediction-badge-muted">' + meta.computeTimeMs + 'ms</span>';
    }
    if (meta.modelsCompleted !== undefined) {
      html += '<span class="prediction-badge prediction-badge-info">' + meta.modelsCompleted + '/' + (meta.modelsRequested || 5) + ' models</span>';
    }
    html += '</div></div>';

    // ── Role Toggle ──
    html += _renderRoleToggle();
    html += '</div>';

    // ── Offline Notice ──
    if (isOffline) {
      html += '<div class="prediction-offline-notice">';
      html += '<strong>&#x1F4F4; Offline Mode:</strong> ' + _esc(result.offlineNotice || 'Connect to the server for full ML predictions.');
      html += '</div>';
    }

    // ── Cohort Quality Panel (if available) ──
    if (result.cohortQuality) {
      html += _renderCohortQualityPanel(result.cohortQuality);
    }

    // ── Section 1: Seizure Freedom Probability ──
    if (pred.seizureFreedom) {
      var sfValidation = (result.validation && result.validation.seizureFreedom) || null;
      var sfVersion = (result.modelVersions && result.modelVersions.seizureFreedom) || null;
      html += _renderSeizureFreedomSection(pred.seizureFreedom, sfValidation, sfVersion);
    }

    // ── Grid: DRE + SUDEP side by side ──
    html += '<div class="prediction-grid-2col">';
    if (pred.dreRisk) {
      html += _renderDRERiskSection(pred.dreRisk);
    }
    if (pred.sudepRisk) {
      html += _renderSUDEPRiskSection(pred.sudepRisk);
    }
    html += '</div>';

    // ── Section 3: Adherence Prediction ──
    if (pred.adherence) {
      html += _renderAdherenceSection(pred.adherence);
    }

    // ── Section 4: Treatment Response ──
    if (pred.treatmentResponse) {
      html += _renderTreatmentResponseSection(pred.treatmentResponse);
    }

    // ── Kaplan-Meier Survival Curve ──
    if (result.timeToEvent) {
      html += _renderKaplanMeierSection(result.timeToEvent);
    }

    // ── Drug Comparisons ──
    if (result.drugComparisons && result.drugComparisons.length > 0) {
      html += _renderDrugComparisonSection(result.drugComparisons);
    }

    // ── Outcome Validation Panel (supplementary area) ──
    html += '<div id="pred-outcome-validation-area"></div>';

    // ── Disclaimer ──
    html += '<div class="prediction-disclaimer">';
    html += '<strong>Clinical Disclaimer:</strong> These predictions are statistical estimates derived from available patient data and published clinical evidence (see references in each section). ';
    html += 'They are <em>not</em> diagnoses or treatment directives. Always exercise clinical judgment. ';
    html += 'Predictions improve in accuracy with more follow-up data. ';
    if (!isOffline) {
      html += 'Model v' + _esc(result.modelVersion || '1.1.0') + ' — validated against ILAE, Kwan & Brodie, and Hesdorffer published benchmarks.';
    }
    html += '</div>';

    return html;
  }

  // ──────────────────────────────────────────────────────────────────
  // §2  Seizure Freedom Section
  // ──────────────────────────────────────────────────────────────────

  function _renderSeizureFreedomSection(sf, validation, version) {
    var probPct = sf.probabilityPercent || 0;
    var ciLow = sf.confidenceIntervalPercent ? sf.confidenceIntervalPercent.low : 0;
    var ciHigh = sf.confidenceIntervalPercent ? sf.confidenceIntervalPercent.high : 100;
    var riskColor = probPct >= 60 ? 'success' : (probPct >= 35 ? 'warning' : 'danger');

    var html = '<div class="prediction-section prediction-section-' + riskColor + '">';

    // Header with validation + version badges
    html += '<div class="prediction-section-header">';
    html += '<div class="prediction-section-title-row">';
    html += '<h4 class="prediction-section-title">Seizure Freedom Probability (12-month)</h4>';
    html += _renderValidationBadge(validation);
    html += _renderVersionBadge(version);
    html += '<span class="prediction-confidence-badge prediction-badge-' + riskColor + '">';
    html += probPct + '% <small>(CI: ' + ciLow + '–' + ciHigh + '%)</small>';
    html += '</span>';
    html += '</div>';

    // Trend badge
    var trendIcon = sf.trendDirection === 'improving' ? '&#x2197;' : (sf.trendDirection === 'worsening' ? '&#x2198;' : '&#x2192;');
    var trendColor = sf.trendDirection === 'improving' ? 'success' : (sf.trendDirection === 'worsening' ? 'danger' : 'muted');
    html += '<span class="prediction-badge prediction-badge-' + trendColor + '">' + trendIcon + ' ' + _capitalize(sf.trendDirection || 'stable') + ' trend</span>';
    if (sf.cohortSize > 0) {
      html += ' <span class="prediction-badge prediction-badge-info">n=' + sf.cohortSize + ' similar patients</span>';
    }
    html += '</div>';

    // Narrative
    html += '<div class="prediction-narrative">' + _esc(sf.interpretation || '') + '</div>';

    // Probability bar
    html += '<div class="prediction-prob-bar-container">';
    html += '<div class="prediction-prob-bar">';
    html += '<div class="prediction-prob-fill prediction-prob-fill-' + riskColor + '" style="width:' + Math.min(probPct, 100) + '%">';
    html += '<span class="prediction-prob-label">' + probPct + '%</span>';
    html += '</div></div>';
    html += '<div class="prediction-prob-ci">';
    html += '<span style="margin-left:' + ciLow + '%">&#x25B2;</span>';
    html += '<span style="margin-left:' + Math.max(0, ciHigh - ciLow - 3) + '%">&#x25B2;</span>';
    html += '</div></div>';

    // Chart area: seizure frequency trend
    html += '<div class="prediction-chart-container">';
    html += '<canvas id="predictionSeizureTrendChart"></canvas>';
    html += '</div>';

    // Feature importance (expandable)
    html += '<div class="prediction-expand-section">';
    html += '<button class="prediction-expand-btn" data-target="sf-features">&#x25BC; Feature Importance & Details</button>';
    html += '<div id="sf-features" class="prediction-detail-panel" style="display:none;">';
    html += _renderFeatureTable(sf.features || []);
    if (sf.references && sf.references.length > 0) {
      html += '<div class="prediction-references"><strong>References:</strong> ' + sf.references.map(function(r) { return '<span class="prediction-ref">' + _esc(r) + '</span>'; }).join(' ') + '</div>';
    }
    html += '</div></div>';

    html += '</div>';
    return html;
  }

  // ──────────────────────────────────────────────────────────────────
  // §3  DRE Risk Section
  // ──────────────────────────────────────────────────────────────────

  function _renderDRERiskSection(dre) {
    var score = dre.score || 0;
    var riskColor = _riskLevelToColor(dre.riskLevel);

    var html = '<div class="prediction-section prediction-section-compact prediction-section-' + riskColor + '">';

    html += '<div class="prediction-section-header">';
    html += '<h4 class="prediction-section-title">DRE Risk</h4>';
    html += '<span class="prediction-risk-level prediction-risk-' + riskColor + '">' + _formatRiskLevel(dre.riskLevel) + '</span>';
    html += '</div>';

    // Gauge (doughnut chart)
    html += '<div class="prediction-gauge-container">';
    html += '<canvas id="predictionDREGaugeChart"></canvas>';
    html += '<div class="prediction-gauge-label">' + score + '<small>/100</small></div>';
    html += '</div>';

    // ILAE trial count
    html += '<div class="prediction-stat-row">';
    html += '<span class="prediction-stat-label">Total ASMs tried:</span>';
    html += '<span class="prediction-stat-value">' + (dre.ilaeTrialCount || 0) + '</span>';
    html += '</div>';
    html += '<div class="prediction-stat-row">';
    html += '<span class="prediction-stat-label">Past trials failed:</span>';
    html += '<span class="prediction-stat-value">' + (dre.pastTrialsFailed || 0) + '</span>';
    html += '</div>';

    // Narrative
    html += '<div class="prediction-narrative prediction-narrative-sm">' + _esc(dre.interpretation || '') + '</div>';

    // Cohort context
    if (dre.cohortSize >= 3) {
      html += '<div class="prediction-cohort-note">';
      html += 'Among ' + dre.cohortSize + ' similar patients, ' + Math.round((dre.cohortReferralRate || 0) * 100) + '% were referred to specialist care.';
      html += '</div>';
    }

    // Recommendation
    html += '<div class="prediction-recommendation">' + _esc(dre.recommendation || '') + '</div>';

    // Expandable criteria
    html += '<div class="prediction-expand-section">';
    html += '<button class="prediction-expand-btn" data-target="dre-criteria">&#x25BC; Criteria Details</button>';
    html += '<div id="dre-criteria" class="prediction-detail-panel" style="display:none;">';
    html += _renderCriteriaTable(dre.criteria || []);
    if (dre.references && dre.references.length > 0) {
      html += '<div class="prediction-references"><strong>References:</strong> ' + dre.references.map(function(r) { return '<span class="prediction-ref">' + _esc(r) + '</span>'; }).join(' ') + '</div>';
    }
    html += '</div></div>';

    html += '</div>';
    return html;
  }

  // ──────────────────────────────────────────────────────────────────
  // §4  SUDEP Risk Section
  // ──────────────────────────────────────────────────────────────────

  function _renderSUDEPRiskSection(sudep) {
    var score = sudep.score || 0;
    var riskColor = _riskLevelToColor(sudep.riskLevel);

    var html = '<div class="prediction-section prediction-section-compact prediction-section-' + riskColor + '">';

    html += '<div class="prediction-section-header">';
    html += '<h4 class="prediction-section-title">SUDEP Risk</h4>';
    html += '<span class="prediction-risk-level prediction-risk-' + riskColor + '">' + _formatRiskLevel(sudep.riskLevel) + '</span>';
    html += '</div>';

    // Radar chart
    html += '<div class="prediction-chart-container prediction-chart-radar">';
    html += '<canvas id="predictionSUDEPRadarChart"></canvas>';
    html += '</div>';

    // Key stats
    html += '<div class="prediction-stat-row">';
    html += '<span class="prediction-stat-label">Score:</span>';
    html += '<span class="prediction-stat-value">' + score + '/100</span>';
    html += '</div>';
    html += '<div class="prediction-stat-row">';
    html += '<span class="prediction-stat-label">Population base rate:</span>';
    html += '<span class="prediction-stat-value prediction-stat-sm">' + _esc(sudep.populationRate || '') + '</span>';
    html += '</div>';

    // Modifiable vs non-modifiable summary
    html += '<div class="prediction-factor-summary">';
    if (sudep.modifiableCount > 0) {
      html += '<span class="prediction-badge prediction-badge-warning">' + sudep.modifiableCount + ' modifiable factor' + (sudep.modifiableCount !== 1 ? 's' : '') + '</span> ';
    }
    if (sudep.nonModifiableCount > 0) {
      html += '<span class="prediction-badge prediction-badge-muted">' + sudep.nonModifiableCount + ' non-modifiable</span>';
    }
    html += '</div>';

    // Narrative
    html += '<div class="prediction-narrative prediction-narrative-sm">' + _esc(sudep.interpretation || '') + '</div>';

    // Expandable factors
    html += '<div class="prediction-expand-section">';
    html += '<button class="prediction-expand-btn" data-target="sudep-factors">&#x25BC; Full Factor Analysis</button>';
    html += '<div id="sudep-factors" class="prediction-detail-panel" style="display:none;">';
    html += _renderSUDEPFactorTable(sudep.factors || []);
    if (sudep.references && sudep.references.length > 0) {
      html += '<div class="prediction-references"><strong>References:</strong> ' + sudep.references.map(function(r) { return '<span class="prediction-ref">' + _esc(r) + '</span>'; }).join(' ') + '</div>';
    }
    html += '</div></div>';

    html += '</div>';
    return html;
  }

  // ──────────────────────────────────────────────────────────────────
  // §5  Adherence Section
  // ──────────────────────────────────────────────────────────────────

  function _renderAdherenceSection(adh) {
    var predLabel = adh.predictedAdherence || 'Unknown';
    var riskColor = predLabel === 'Good' ? 'success' : (predLabel === 'At Risk' ? 'warning' : 'danger');

    var html = '<div class="prediction-section prediction-section-' + riskColor + '">';

    html += '<div class="prediction-section-header">';
    html += '<div class="prediction-section-title-row">';
    html += '<h4 class="prediction-section-title">Adherence Forecast</h4>';
    html += '<span class="prediction-confidence-badge prediction-badge-' + riskColor + '">';
    html += _esc(predLabel) + ' <small>(' + (adh.probabilityPercent || 0) + '% confidence)</small>';
    html += '</span>';
    html += '</div>';

    var trendIcon = adh.trend === 'improving' ? '&#x2197;' : (adh.trend === 'declining' ? '&#x2198;' : '&#x2192;');
    var trendColor = adh.trend === 'improving' ? 'success' : (adh.trend === 'declining' ? 'danger' : 'muted');
    html += '<span class="prediction-badge prediction-badge-' + trendColor + '">' + trendIcon + ' ' + _capitalize(adh.trend || 'stable') + '</span>';
    html += '</div>';

    // Narrative
    html += '<div class="prediction-narrative">' + _esc(adh.interpretation || '') + '</div>';

    // Chart: adherence history
    html += '<div class="prediction-chart-container">';
    html += '<canvas id="predictionAdherenceChart"></canvas>';
    html += '</div>';

    // Risk factors
    if (adh.riskFactors && adh.riskFactors.length > 0) {
      html += '<div class="prediction-risk-factors">';
      html += '<h5>Risk Factors & Recommendations</h5>';
      adh.riskFactors.forEach(function(rf) {
        var icon = rf.impact === 'positive' ? '&#x2705;' : (rf.impact === 'negative' ? '&#x26A0;' : '&#x2139;');
        var rfColor = rf.impact === 'positive' ? 'success' : 'warning';
        html += '<div class="prediction-risk-factor-item prediction-rf-' + rfColor + '">';
        html += '<div class="prediction-rf-header">';
        html += '<span class="prediction-rf-icon">' + icon + '</span>';
        html += '<strong>' + _esc(rf.factor) + '</strong>';
        if (rf.modifiable) html += ' <span class="prediction-badge prediction-badge-tiny prediction-badge-info">Modifiable</span>';
        html += '</div>';
        html += '<div class="prediction-rf-detail">' + _esc(rf.detail || '') + '</div>';
        if (rf.recommendation) {
          html += '<div class="prediction-rf-recommendation"><em>' + _esc(rf.recommendation) + '</em></div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // Expandable references
    html += '<div class="prediction-expand-section">';
    html += '<button class="prediction-expand-btn" data-target="adh-refs">&#x25BC; References</button>';
    html += '<div id="adh-refs" class="prediction-detail-panel" style="display:none;">';
    if (adh.references && adh.references.length > 0) {
      html += '<div class="prediction-references">' + adh.references.map(function(r) { return '<span class="prediction-ref">' + _esc(r) + '</span>'; }).join(' ') + '</div>';
    }
    html += '</div></div>';

    html += '</div>';
    return html;
  }

  // ──────────────────────────────────────────────────────────────────
  // §6  Treatment Response Section
  // ──────────────────────────────────────────────────────────────────

  function _renderTreatmentResponseSection(tr) {
    var meds = tr.medications || [];
    if (meds.length === 0) {
      return '<div class="prediction-section prediction-section-muted"><h4 class="prediction-section-title">Treatment Response</h4><p class="prediction-narrative">No current medications to analyze.</p></div>';
    }

    var html = '<div class="prediction-section">';

    html += '<div class="prediction-section-header">';
    html += '<h4 class="prediction-section-title">Treatment Response Forecast</h4>';
    html += '</div>';

    // Narrative
    html += '<div class="prediction-narrative">' + _esc(tr.interpretation || '') + '</div>';

    // Chart: grouped bar
    html += '<div class="prediction-chart-container">';
    html += '<canvas id="predictionTreatmentChart"></canvas>';
    html += '</div>';

    // Per-drug cards
    html += '<div class="prediction-drug-cards">';
    meds.forEach(function(med) {
      var trajColor = _trajectoryColor(med.patientTrajectory);
      html += '<div class="prediction-drug-card prediction-drug-' + trajColor + '">';
      html += '<div class="prediction-drug-header">';
      html += '<strong>' + _esc(med.drug || '') + '</strong>';
      if (med.dosage) html += ' <small>(' + _esc(med.dosage) + ')</small>';
      html += '</div>';

      if (med.cohortSize > 0) {
        html += '<div class="prediction-drug-stats">';
        html += '<div class="prediction-stat-row"><span class="prediction-stat-label">Seizure freedom:</span><span class="prediction-stat-value">' + (med.seizureFreedomPercent !== null ? (med.seizureFreedomPercent + '%') : '—') + '</span></div>';
        html += '<div class="prediction-stat-row"><span class="prediction-stat-label">Side effects:</span><span class="prediction-stat-value">' + (med.sideEffectPercent !== null ? (med.sideEffectPercent + '%') : '—') + '</span></div>';
        html += '<div class="prediction-stat-row"><span class="prediction-stat-label">Cohort size:</span><span class="prediction-stat-value">n=' + med.cohortSize + '</span></div>';
        html += '</div>';
      } else {
        html += '<div class="prediction-drug-stats"><em>Insufficient cohort data</em></div>';
      }

      html += '<div class="prediction-drug-trajectory">';
      html += '<span class="prediction-badge prediction-badge-' + trajColor + '">' + _formatTrajectory(med.patientTrajectory) + '</span>';
      html += '<div class="prediction-rf-detail">' + _esc(med.trajectoryDetail || '') + '</div>';
      html += '</div>';

      html += '</div>';
    });
    html += '</div>';

    // Optimization suggestions
    var suggestions = tr.optimizationSuggestions || [];
    if (suggestions.length > 0) {
      html += '<div class="prediction-optimization">';
      html += '<h5>&#x1F4A1; Optimization Suggestions</h5>';
      suggestions.forEach(function(s) {
        html += '<div class="prediction-suggestion-card">';
        html += '<strong>Consider: ' + _esc(s.drug) + '</strong>';
        html += '<div class="prediction-rf-detail">' + _esc(s.rationale || '') + '</div>';
        html += '<span class="prediction-badge prediction-badge-info">Evidence: ' + _esc(s.evidenceStrength || 'limited') + ' (n=' + (s.cohortSize || 0) + ')</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // References
    html += '<div class="prediction-expand-section">';
    html += '<button class="prediction-expand-btn" data-target="tr-refs">&#x25BC; References</button>';
    html += '<div id="tr-refs" class="prediction-detail-panel" style="display:none;">';
    if (tr.references && tr.references.length > 0) {
      html += '<div class="prediction-references">' + tr.references.map(function(r) { return '<span class="prediction-ref">' + _esc(r) + '</span>'; }).join(' ') + '</div>';
    }
    html += '</div></div>';

    html += '</div>';
    return html;
  }

  // ──────────────────────────────────────────────────────────────────
  // §7  Chart Initialization
  // ──────────────────────────────────────────────────────────────────

  function _initializePredictionCharts(result, followUps) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded — skipping prediction charts');
      return;
    }

    var pred = result.predictions;

    // 1. Seizure Trend Line Chart
    if (pred.seizureFreedom && pred.seizureFreedom.seizureHistory) {
      _renderSeizureTrendChart(pred.seizureFreedom);
    }

    // 2. DRE Gauge Chart
    if (pred.dreRisk) {
      _renderDREGaugeChart(pred.dreRisk);
    }

    // 3. SUDEP Radar Chart
    if (pred.sudepRisk && pred.sudepRisk.factors) {
      _renderSUDEPRadarChart(pred.sudepRisk);
    }

    // 4. Adherence History Chart
    if (pred.adherence && pred.adherence.historicalScores) {
      _renderAdherenceChart(pred.adherence);
    }

    // 5. Treatment Response Chart
    if (pred.treatmentResponse && pred.treatmentResponse.medications) {
      _renderTreatmentChart(pred.treatmentResponse);
    }

    // 6. Kaplan-Meier Survival Curve
    if (result.timeToEvent) {
      _renderKMChart(result.timeToEvent);
    }
  }

  function _renderSeizureTrendChart(sf) {
    var canvas = document.getElementById('predictionSeizureTrendChart');
    if (!canvas) return;

    var history = sf.seizureHistory || [];
    var labels = history.map(function(h, i) {
      return _formatShortDate(h.date) || ('FU ' + (i + 1));
    });
    var values = history.map(function(h) { return h.value; });

    // Projection: extend 2 points into future
    var projLabels = labels.slice();
    var projValues = [];
    var trendLine = [];

    if (values.length >= 2) {
      // Compute trend line
      var n = values.length;
      var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (var i = 0; i < n; i++) {
        sumX += i; sumY += values[i]; sumXY += i * values[i]; sumX2 += i * i;
      }
      var denom = n * sumX2 - sumX * sumX;
      var slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
      var intercept = (sumY - slope * sumX) / n;

      for (var j = 0; j < n; j++) {
        trendLine.push(Math.max(0, intercept + slope * j));
      }

      // Forecast 2 points
      for (var k = 0; k < 2; k++) {
        projLabels.push('Projected ' + (k + 1));
        projValues.push(null); // no actual data
        trendLine.push(Math.max(0, intercept + slope * (n + k)));
      }
    }

    // Fill projValues to match labels length
    while (projValues.length < values.length) {
      projValues.unshift(values[projValues.length] !== undefined ? values[projValues.length] : null);
    }

    _destroyChart('predictionSeizureTrendChart');
    _predictionCharts['predictionSeizureTrendChart'] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: projLabels,
        datasets: [
          {
            label: 'Seizures',
            data: values.concat(new Array(projLabels.length - values.length).fill(null)),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6'
          },
          {
            label: 'Trend / Forecast',
            data: trendLine,
            borderColor: '#f97316',
            borderDash: [5, 5],
            fill: false,
            tension: 0,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          title: { display: true, text: 'Seizure Frequency Trend & Projection', font: { size: 13 } },
          datalabels: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Seizures', font: { size: 11 } },
            ticks: { precision: 0 }
          },
          x: {
            title: { display: true, text: 'Follow-up', font: { size: 11 } }
          }
        }
      }
    });
  }

  function _renderDREGaugeChart(dre) {
    var canvas = document.getElementById('predictionDREGaugeChart');
    if (!canvas) return;

    var score = dre.score || 0;
    var remaining = 100 - score;

    var gaugeColor = '#22c55e'; // green
    if (score >= 81) gaugeColor = '#dc2626'; // red
    else if (score >= 61) gaugeColor = '#f97316'; // orange
    else if (score >= 31) gaugeColor = '#eab308'; // yellow

    _destroyChart('predictionDREGaugeChart');
    _predictionCharts['predictionDREGaugeChart'] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [score, remaining],
          backgroundColor: [gaugeColor, '#e5e7eb'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        circumference: 180,
        rotation: 270,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: { display: false }
        }
      }
    });
  }

  function _renderSUDEPRadarChart(sudep) {
    var canvas = document.getElementById('predictionSUDEPRadarChart');
    if (!canvas) return;

    var factors = sudep.factors || [];
    // Take factors that have maxScore > 0
    var radarFactors = factors.filter(function(f) { return f.maxScore > 0; });

    var labels = radarFactors.map(function(f) {
      // Shorten labels for radar
      var name = f.factor || '';
      if (name.length > 25) name = name.substring(0, 22) + '...';
      return name;
    });

    var values = radarFactors.map(function(f) {
      return f.maxScore > 0 ? Math.round((f.score / f.maxScore) * 100) : 0;
    });

    _destroyChart('predictionSUDEPRadarChart');
    _predictionCharts['predictionSUDEPRadarChart'] = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Risk Level (%)',
          data: values,
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: '#ef4444',
          borderWidth: 2,
          pointBackgroundColor: '#ef4444',
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: { display: false }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { display: false, stepSize: 25 },
            pointLabels: { font: { size: 9 } }
          }
        }
      }
    });
  }

  function _renderAdherenceChart(adh) {
    var canvas = document.getElementById('predictionAdherenceChart');
    if (!canvas) return;

    var history = adh.historicalScores || [];
    var labels = history.map(function(h, i) {
      return _formatShortDate(h.date) || ('FU ' + (i + 1));
    });
    var scores = history.map(function(h) { return h.score; });

    // Color code: generate segment colors
    var pointColors = scores.map(function(s) {
      if (s >= 3.5) return '#22c55e';
      if (s >= 2.5) return '#eab308';
      if (s >= 1.5) return '#f97316';
      return '#dc2626';
    });

    _destroyChart('predictionAdherenceChart');
    _predictionCharts['predictionAdherenceChart'] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Adherence Score',
          data: scores,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Adherence Score Over Time', font: { size: 13 } },
          datalabels: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 5,
            title: { display: true, text: 'Score', font: { size: 11 } },
            ticks: {
              stepSize: 1,
              callback: function(value) {
                var labels = { 1: 'Stopped', 2: 'Freq. Miss', 3: 'Occ. Miss', 4: 'Always' };
                return labels[value] || '';
              }
            }
          },
          x: {
            title: { display: true, text: 'Follow-up', font: { size: 11 } }
          }
        }
      }
    });
  }

  function _renderTreatmentChart(tr) {
    var canvas = document.getElementById('predictionTreatmentChart');
    if (!canvas) return;

    var meds = (tr.medications || []).filter(function(m) { return m.cohortSize > 0; });
    if (meds.length === 0) return;

    var labels = meds.map(function(m) { return m.drug || ''; });
    var freedomData = meds.map(function(m) { return m.seizureFreedomPercent || 0; });
    var sideEffectData = meds.map(function(m) { return m.sideEffectPercent || 0; });

    _destroyChart('predictionTreatmentChart');
    _predictionCharts['predictionTreatmentChart'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Seizure Freedom %',
            data: freedomData,
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor: '#22c55e',
            borderWidth: 1
          },
          {
            label: 'Side Effect %',
            data: sideEffectData,
            backgroundColor: 'rgba(239, 68, 68, 0.5)',
            borderColor: '#ef4444',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          title: { display: true, text: 'Cohort Medication Outcomes', font: { size: 13 } },
          datalabels: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Percentage (%)', font: { size: 11 } }
          }
        }
      }
    });
  }

  /**
   * Initialize charts from local data when backend fails —
   * shows seizure trend sparkline only.
   */
  function _initializeLocalCharts(followUps) {
    if (typeof Chart === 'undefined') return;

    var szTrend = window.PredictionDataPrep.computeSeizureTrend(followUps);
    var canvas = document.getElementById('predictionLocalSeizureChart');
    if (!canvas || szTrend.values.length === 0) return;

    var labels = szTrend.values.map(function(v, i) { return _formatShortDate(v.date) || ('FU ' + (i + 1)); });
    var values = szTrend.values.map(function(v) { return v.freq; });

    _destroyChart('predictionLocalSeizureChart');
    _predictionCharts['predictionLocalSeizureChart'] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Seizures (local data)',
          data: values,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Seizure Frequency (Local Data)', font: { size: 12 } }, datalabels: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // §8a  New v1.1 Sections — Quality, KM, Drug Comparison, Validation
  // ──────────────────────────────────────────────────────────────────

  /**
   * Render a single model card (for progressive streaming).
   */
  function _renderSingleModelCard(modelName, pred, validation, version) {
    var valBadge = _renderValidationBadge(validation);
    var verBadge = _renderVersionBadge(version);

    switch (modelName) {
      case 'seizureFreedom':
        return _renderSeizureFreedomSection(pred, validation, version);
      case 'dreRisk':
        return _renderDRERiskSection(pred);
      case 'sudepRisk':
        return _renderSUDEPRiskSection(pred);
      case 'adherence':
        return _renderAdherenceSection(pred);
      case 'treatmentResponse':
        return _renderTreatmentResponseSection(pred);
      default:
        return '<div class="prediction-section"><h4>' + _formatModelName(modelName) + '</h4></div>';
    }
  }

  /**
   * Append supplementary sections after all models complete.
   */
  function _appendSupplementarySections(container, result, patient, chronoFollowUps) {
    if (!container) return;

    // Add cohort quality panel if not already present
    var qualityArea = container.querySelector('.prediction-quality-panel');
    if (!qualityArea && result.cohortQuality) {
      var header = container.querySelector('.prediction-main-header');
      if (header) {
        var div = document.createElement('div');
        div.innerHTML = _renderCohortQualityPanel(result.cohortQuality);
        header.parentNode.insertBefore(div.firstChild, header.nextSibling);
      }
    }

    // Add KM section
    if (result.timeToEvent) {
      var kmArea = container.querySelector('.prediction-km-section');
      if (!kmArea) {
        var kmDiv = document.createElement('div');
        kmDiv.innerHTML = _renderKaplanMeierSection(result.timeToEvent);
        var disclaimer = container.querySelector('.prediction-disclaimer');
        if (disclaimer) disclaimer.parentNode.insertBefore(kmDiv.firstChild, disclaimer);
      }
    }

    // Add drug comparisons
    if (result.drugComparisons && result.drugComparisons.length > 0) {
      var dcArea = container.querySelector('.prediction-drug-comp-section');
      if (!dcArea) {
        var dcDiv = document.createElement('div');
        dcDiv.innerHTML = _renderDrugComparisonSection(result.drugComparisons);
        var disclaimer2 = container.querySelector('.prediction-disclaimer');
        if (disclaimer2) disclaimer2.parentNode.insertBefore(dcDiv.firstChild, disclaimer2);
      }
    }

    // Load outcome validation history
    var valArea = document.getElementById('pred-outcome-validation-area');
    if (valArea) {
      var patientId = patient.ID || patient.id || '';
      _loadOutcomeValidation(valArea, patientId);
    }
  }

  /**
   * Render role toggle (CHO compact / Physician full).
   */
  function _renderRoleToggle() {
    var html = '<div class="prediction-role-toggle">';
    html += '<label class="prediction-role-label">View:</label>';
    html += '<button class="prediction-role-btn' + (_currentViewRole === 'physician' ? ' prediction-role-active' : '') + '" onclick="window._setPredictionViewRole(\'physician\')">&#x1F9D1;&#x200D;&#x2695;&#xFE0F; Physician</button>';
    html += '<button class="prediction-role-btn' + (_currentViewRole === 'cho' ? ' prediction-role-active' : '') + '" onclick="window._setPredictionViewRole(\'cho\')">&#x1F3E5; CHO</button>';
    html += '</div>';
    return html;
  }

  window._setPredictionViewRole = function(role) {
    _currentViewRole = role;
    // Re-render with stored patient data
    if (window._lastPredictionPatient) {
      var container = document.getElementById('predictionsContainer');
      if (container) {
        window.renderPredictionsTab(container, window._lastPredictionPatient, window._lastPredictionFollowUps);
      }
    }
  };

  /**
   * Render validation badge for a model (full / degraded / insufficient).
   */
  function _renderValidationBadge(validation) {
    if (!validation) return '';
    var conf = validation.confidence || 'full';
    var colorMap = { full: 'success', degraded: 'warning', insufficient: 'danger' };
    var labelMap = { full: '✓ Full Confidence', degraded: '⚠ Degraded', insufficient: '✗ Insufficient' };
    var color = colorMap[conf] || 'muted';
    var label = labelMap[conf] || conf;
    var html = '<span class="prediction-badge prediction-badge-' + color + ' prediction-validation-badge" title="' + _esc(validation.message || '') + '">' + label + '</span>';
    return html;
  }

  /**
   * Render model version badge with accuracy metrics.
   */
  function _renderVersionBadge(version) {
    if (!version) return '';
    var html = '<span class="prediction-version-badge" title="';
    html += 'Algorithm: ' + _esc(version.algorithm || '') + '&#10;';
    html += 'Sensitivity: ' + ((version.sensitivity || 0) * 100).toFixed(0) + '%&#10;';
    html += 'Specificity: ' + ((version.specificity || 0) * 100).toFixed(0) + '%&#10;';
    html += 'AUC: ' + (version.auc || 0).toFixed(2) + '">';
    html += 'v' + _esc(version.version || '1.0');
    if (version.auc) html += ' <small>(AUC ' + version.auc.toFixed(2) + ')</small>';
    html += '</span>';
    return html;
  }

  /**
   * Render Cohort Quality metadata panel.
   */
  function _renderCohortQualityPanel(quality) {
    if (!quality) return '';
    var score = quality.overallScore || 0;
    var scoreColor = score >= 70 ? 'success' : (score >= 40 ? 'warning' : 'danger');

    var html = '<div class="prediction-quality-panel prediction-section">';
    html += '<div class="prediction-section-header">';
    html += '<h4 class="prediction-section-title">&#x1F4CA; Cohort Data Quality</h4>';
    html += '<span class="prediction-quality-score prediction-badge-' + scoreColor + '">' + score + '/100</span>';
    html += '</div>';

    // Field completeness bars
    if (quality.fieldCompleteness) {
      html += '<div class="prediction-quality-fields">';
      var fields = quality.fieldCompleteness;
      Object.keys(fields).forEach(function(fieldName) {
        var f = fields[fieldName];
        var pct = f.percent || 0;
        var barColor = pct >= 80 ? '#22c55e' : (pct >= 50 ? '#eab308' : '#ef4444');
        html += '<div class="prediction-quality-field-row">';
        html += '<span class="prediction-quality-field-name">' + _esc(fieldName) + '</span>';
        html += '<div class="prediction-quality-bar"><div class="prediction-quality-bar-fill" style="width:' + pct + '%;background:' + barColor + '"></div></div>';
        html += '<span class="prediction-quality-field-pct">' + pct + '%</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // Demographic balance (compact)
    if (quality.demographicBalance) {
      html += '<div class="prediction-quality-demo">';
      if (quality.demographicBalance.gender) {
        var g = quality.demographicBalance.gender;
        html += '<span class="prediction-badge prediction-badge-muted">♂ ' + (g.male || 0) + ' / ♀ ' + (g.female || 0) + '</span> ';
      }
      html += '<span class="prediction-badge prediction-badge-muted">' + (quality.totalPatients || 0) + ' patients</span>';
      html += '</div>';
    }

    // Staleness
    if (quality.staleness && quality.staleness.daysSinceLatest > 30) {
      html += '<div class="prediction-quality-warning">⚠ Latest follow-up is ' + quality.staleness.daysSinceLatest + ' days old — data may be stale</div>';
    }

    // Warnings
    if (quality.warnings && quality.warnings.length > 0) {
      quality.warnings.forEach(function(w) {
        var wClass = w.level === 'warning' ? 'prediction-quality-warning' : 'prediction-quality-info';
        html += '<div class="' + wClass + '">⚠ ' + _esc(w.message) + '</div>';
      });
    }

    html += '</div>';
    return html;
  }

  /**
   * Render Kaplan-Meier survival curve section.
   */
  function _renderKaplanMeierSection(tte) {
    if (!tte || !tte.curve || tte.curve.length < 2) return '';

    var html = '<div class="prediction-section prediction-km-section">';
    html += '<div class="prediction-section-header">';
    html += '<h4 class="prediction-section-title">&#x1F4C9; Kaplan-Meier Survival Analysis</h4>';
    html += '</div>';

    // Key stats
    html += '<div class="prediction-km-stats">';
    html += '<div class="prediction-stat-row"><span class="prediction-stat-label">Cohort size:</span><span class="prediction-stat-value">n=' + (tte.totalPatients || 0) + '</span></div>';
    html += '<div class="prediction-stat-row"><span class="prediction-stat-label">Events:</span><span class="prediction-stat-value">' + (tte.totalEvents || 0) + ' (' + ((tte.eventRate || 0) * 100).toFixed(1) + '%)</span></div>';
    if (tte.medianTimeToEvent !== null && tte.medianTimeToEvent !== undefined) {
      html += '<div class="prediction-stat-row"><span class="prediction-stat-label">Median time to event:</span><span class="prediction-stat-value">' + tte.medianTimeToEvent + ' months</span></div>';
    }
    if (tte.q25 !== null && tte.q75 !== null) {
      html += '<div class="prediction-stat-row"><span class="prediction-stat-label">IQR:</span><span class="prediction-stat-value">' + (tte.q25 || '—') + '–' + (tte.q75 || '—') + ' months</span></div>';
    }
    html += '</div>';

    // Interpretation
    if (tte.interpretation) {
      html += '<div class="prediction-narrative">' + _esc(tte.interpretation) + '</div>';
    }

    // Chart placeholder
    html += '<div class="prediction-chart-container prediction-km-chart-container">';
    html += '<canvas id="predictionKMChart"></canvas>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  /**
   * Render Drug Comparison section with p-values.
   */
  function _renderDrugComparisonSection(comparisons) {
    if (!comparisons || comparisons.length === 0) return '';

    var html = '<div class="prediction-section prediction-drug-comp-section">';
    html += '<div class="prediction-section-header">';
    html += '<h4 class="prediction-section-title">&#x1F48A; Drug Comparison (Log-Rank Test)</h4>';
    html += '</div>';

    html += '<table class="prediction-table prediction-drug-comp-table">';
    html += '<thead><tr><th>Current Drug</th><th>vs Alternative</th><th>Median (Current)</th><th>Median (Alt.)</th><th>p-value</th><th>Significance</th></tr></thead>';
    html += '<tbody>';

    comparisons.forEach(function(comp) {
      var pVal = comp.pValue || 1;
      var sigClass = pVal < 0.05 ? 'prediction-sig-positive' : 'prediction-sig-neutral';
      var sigLabel = pVal < 0.001 ? '***' : (pVal < 0.01 ? '**' : (pVal < 0.05 ? '*' : 'n.s.'));

      html += '<tr class="' + sigClass + '">';
      html += '<td><strong>' + _esc(comp.currentDrug || '') + '</strong></td>';
      html += '<td>' + _esc(comp.alternativeDrug || '') + '</td>';
      html += '<td>' + (comp.currentMedian !== null ? comp.currentMedian + ' mo' : '—') + '</td>';
      html += '<td>' + (comp.alternativeMedian !== null ? comp.alternativeMedian + ' mo' : '—') + '</td>';
      html += '<td>' + (pVal < 0.001 ? '<0.001' : pVal.toFixed(3)) + '</td>';
      html += '<td><span class="prediction-badge prediction-badge-' + (pVal < 0.05 ? 'warning' : 'muted') + '">' + sigLabel + '</span></td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '<div class="prediction-narrative prediction-narrative-sm"><em>* p<0.05, ** p<0.01, *** p<0.001. n.s. = not significant. Comparisons use simplified log-rank test on institutional cohort data.</em></div>';
    html += '</div>';
    return html;
  }

  /**
   * Load and render outcome validation history for a patient.
   */
  function _loadOutcomeValidation(container, patientId) {
    if (!patientId || typeof window.PredictionEngine.getPredictionHistory !== 'function') return;

    window.PredictionEngine.getPredictionHistory(patientId)
      .then(function(historyData) {
        container.innerHTML = _renderOutcomeValidationPanel(historyData, patientId);
        _initializeExpandCollapse(container);
      })
      .catch(function(err) {
        // Silently fail — outcome validation is optional
        console.log('Outcome validation load skipped:', err.message);
      });
  }

  /**
   * Render outcome validation panel with history and pending validations.
   */
  function _renderOutcomeValidationPanel(historyData, patientId) {
    if (!historyData) return '';

    var predictions = historyData.predictions || [];
    var pending = predictions.filter(function(p) { return p.isEligible && !p.isValidated; });
    var validated = predictions.filter(function(p) { return p.isValidated; });

    if (predictions.length === 0) return '';

    var html = '<div class="prediction-section prediction-outcome-section">';
    html += '<div class="prediction-section-header">';
    html += '<h4 class="prediction-section-title">&#x2705; Outcome Validation</h4>';
    if (historyData.averageAccuracy !== null && historyData.averageAccuracy !== undefined) {
      html += '<span class="prediction-badge prediction-badge-info">Avg Accuracy: ' + historyData.averageAccuracy + '%</span>';
    }
    html += '</div>';

    // Pending validations
    if (pending.length > 0) {
      html += '<div class="prediction-outcome-pending">';
      html += '<h5>&#x23F3; Pending Validation (' + pending.length + ')</h5>';
      pending.forEach(function(p) {
        html += '<div class="prediction-outcome-card prediction-outcome-pending-card">';
        html += '<div class="prediction-outcome-card-header">';
        html += '<strong>' + _formatModelName(p.modelName) + '</strong>';
        html += '<span class="prediction-badge prediction-badge-muted">' + _formatTimestamp(p.predictionDate) + '</span>';
        html += '</div>';
        html += '<div class="prediction-outcome-card-body">';
        html += '<p>Predicted: <strong>' + _esc(p.predictedLabel || p.predictedValue) + '</strong> (Confidence: ' + (p.confidencePercent || 0) + '%)</p>';
        html += '<p class="prediction-outcome-eligible">Eligible for validation (' + (p.monthsAgo || 0) + ' months ago)</p>';
        html += '</div>';
        html += '<div class="prediction-outcome-form" id="outcome-form-' + _esc(p.predictionId) + '">';
        html += _renderOutcomeForm(p);
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    // Validated history (expandable)
    if (validated.length > 0) {
      html += '<div class="prediction-expand-section">';
      html += '<button class="prediction-expand-btn" data-target="validated-history">&#x25BC; Validated History (' + validated.length + ')</button>';
      html += '<div id="validated-history" class="prediction-detail-panel" style="display:none;">';
      html += '<table class="prediction-table"><thead><tr><th>Model</th><th>Predicted</th><th>Actual</th><th>Accuracy</th><th>Date</th><th>Validated By</th></tr></thead><tbody>';
      validated.forEach(function(v) {
        var accColor = (v.accuracyScore || 0) >= 70 ? 'success' : ((v.accuracyScore || 0) >= 40 ? 'warning' : 'danger');
        html += '<tr>';
        html += '<td>' + _formatModelName(v.modelName) + '</td>';
        html += '<td>' + _esc(v.predictedLabel || v.predictedValue) + '</td>';
        html += '<td>' + _esc(v.actualOutcome || '—') + '</td>';
        html += '<td><span class="prediction-badge prediction-badge-' + accColor + '">' + (v.accuracyScore || 0) + '%</span></td>';
        html += '<td>' + _formatTimestamp(v.validationDate) + '</td>';
        html += '<td>' + _esc(v.validatedBy || '—') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      html += '</div></div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Render outcome validation form for a single prediction.
   */
  function _renderOutcomeForm(prediction) {
    var pid = _esc(prediction.predictionId || '');
    var modelName = prediction.modelName || '';

    // Outcome options depend on model
    var options = _getOutcomeOptions(modelName);

    var html = '<div class="prediction-outcome-form-inner">';
    html += '<label>Actual Outcome:</label>';
    html += '<select class="prediction-outcome-select" id="outcome-select-' + pid + '">';
    html += '<option value="">— Select outcome —</option>';
    options.forEach(function(opt) {
      html += '<option value="' + _esc(opt.value) + '">' + _esc(opt.label) + '</option>';
    });
    html += '</select>';
    html += '<label>Notes (optional):</label>';
    html += '<textarea class="prediction-outcome-notes" id="outcome-notes-' + pid + '" rows="2" placeholder="Additional observations..."></textarea>';
    html += '<button class="prediction-outcome-submit" onclick="window._submitOutcomeValidation(\'' + pid + '\')">Submit Validation</button>';
    html += '</div>';
    return html;
  }

  function _getOutcomeOptions(modelName) {
    switch (modelName) {
      case 'seizureFreedom':
        return [
          { value: 'seizure-free', label: 'Seizure Free' },
          { value: 'improved', label: 'Improved (partial)' },
          { value: 'no-change', label: 'No Change' },
          { value: 'worsened', label: 'Worsened' }
        ];
      case 'dreRisk':
        return [
          { value: 'confirmed-dre', label: 'DRE Confirmed' },
          { value: 'not-dre', label: 'Not DRE' },
          { value: 'uncertain', label: 'Uncertain / Ongoing' }
        ];
      case 'adherence':
        return [
          { value: 'good', label: 'Good Adherence' },
          { value: 'at-risk', label: 'At Risk' },
          { value: 'poor', label: 'Poor Adherence' }
        ];
      case 'sudepRisk':
        return [
          { value: 'no-event', label: 'No SUDEP Event' },
          { value: 'event', label: 'SUDEP Event Occurred' },
          { value: 'near-miss', label: 'Near-miss / Warning' }
        ];
      case 'treatmentResponse':
        return [
          { value: 'good-response', label: 'Good Response' },
          { value: 'partial', label: 'Partial Response' },
          { value: 'no-response', label: 'No Response' },
          { value: 'adverse', label: 'Adverse Effects' }
        ];
      default:
        return [
          { value: 'positive', label: 'Positive Outcome' },
          { value: 'negative', label: 'Negative Outcome' },
          { value: 'uncertain', label: 'Uncertain' }
        ];
    }
  }

  /**
   * Submit outcome validation — called from form button.
   */
  window._submitOutcomeValidation = function(predictionId) {
    var selectEl = document.getElementById('outcome-select-' + predictionId);
    var notesEl = document.getElementById('outcome-notes-' + predictionId);
    if (!selectEl || !selectEl.value) {
      alert('Please select an actual outcome.');
      return;
    }
    var formContainer = document.getElementById('outcome-form-' + predictionId);
    if (formContainer) formContainer.innerHTML = '<p class="prediction-outcome-submitting">Submitting...</p>';

    window.PredictionEngine.validateOutcome(predictionId, selectEl.value, {
      notes: notesEl ? notesEl.value : ''
    }).then(function(resp) {
      if (formContainer) {
        formContainer.innerHTML = '<p class="prediction-outcome-success">&#x2705; Validated! Accuracy: ' + ((resp && resp.accuracyScore) || '—') + '%</p>';
      }
    }).catch(function(err) {
      if (formContainer) {
        formContainer.innerHTML = '<p class="prediction-outcome-error">&#x274C; Error: ' + _esc(err.message) + '</p>';
      }
    });
  };

  /**
   * Detect user role from global context.
   */
  function _detectUserRole() {
    if (window.currentUserRole) return window.currentUserRole;
    if (window.userRole) return window.userRole;
    if (typeof window.getUserRole === 'function') return window.getUserRole();
    return 'physician';
  }

  /**
   * Format model name for display.
   */
  function _formatModelName(name) {
    var map = {
      seizureFreedom: 'Seizure Freedom',
      dreRisk: 'DRE Risk',
      adherence: 'Adherence',
      sudepRisk: 'SUDEP Risk',
      treatmentResponse: 'Treatment Response'
    };
    return map[name] || _capitalize(name || '');
  }

  // ──────────────────────────────────────────────────────────────────
  // §8b  KM Chart Initialization
  // ──────────────────────────────────────────────────────────────────

  function _renderKMChart(tte) {
    var canvas = document.getElementById('predictionKMChart');
    if (!canvas || !tte || !tte.curve || tte.curve.length < 2) return;
    if (typeof Chart === 'undefined') return;

    var labels = tte.curve.map(function(p) { return p.time; });
    var survivalData = tte.curve.map(function(p) { return Math.round(p.survival * 1000) / 10; }); // convert to %

    _destroyChart('predictionKMChart');
    _predictionCharts['predictionKMChart'] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Survival Probability (%)',
          data: survivalData,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          stepped: 'before',
          pointRadius: 2,
          pointBackgroundColor: '#6366f1',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          title: { display: true, text: 'Kaplan-Meier Survival Curve', font: { size: 13 } },
          datalabels: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            title: { display: true, text: 'Survival (%)', font: { size: 11 } }
          },
          x: {
            title: { display: true, text: 'Time (months)', font: { size: 11 } },
            ticks: { precision: 0 }
          }
        }
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // §8  Loading, Error, Insufficient States
  // ──────────────────────────────────────────────────────────────────

  function _renderLoadingSkeleton(patient, followUps) {
    var quickStats = window.PredictionDataPrep.computeQuickStats(patient, followUps);

    var html = '<div class="prediction-loading">';
    html += '<div class="prediction-main-header">';
    html += '<h3 class="prediction-main-title"><span class="prediction-icon">&#x1F9E0;</span> Clinical Predictions</h3>';
    html += '<div class="prediction-meta-badges">';
    html += '<span class="prediction-badge prediction-badge-info">Loading models...</span>';
    html += '<span class="prediction-badge prediction-badge-muted">' + quickStats.followUpCount + ' follow-ups</span>';
    html += '</div>';
    html += _renderRoleToggle();
    html += '</div>';

    // Quick stats preview from local data
    html += '<div class="prediction-quick-stats">';
    html += '<div class="prediction-quick-stat">';
    html += '<span class="prediction-quick-label">Seizure Trend</span>';
    html += '<span class="prediction-quick-value prediction-quick-' + (quickStats.seizureTrend.direction === 'improving' ? 'success' : (quickStats.seizureTrend.direction === 'worsening' ? 'danger' : 'muted')) + '">';
    html += _capitalize(quickStats.seizureTrend.direction);
    html += '</span></div>';
    html += '<div class="prediction-quick-stat">';
    html += '<span class="prediction-quick-label">Adherence Trend</span>';
    html += '<span class="prediction-quick-value prediction-quick-' + (quickStats.adherenceHistory.direction === 'improving' ? 'success' : (quickStats.adherenceHistory.direction === 'declining' ? 'danger' : 'muted')) + '">';
    html += _capitalize(quickStats.adherenceHistory.direction);
    html += '</span></div>';
    html += '<div class="prediction-quick-stat">';
    html += '<span class="prediction-quick-label">Medications</span>';
    html += '<span class="prediction-quick-value">' + quickStats.medicationCount + '</span>';
    html += '</div>';
    html += '<div class="prediction-quick-stat">';
    html += '<span class="prediction-quick-label">Follow-up Regularity</span>';
    html += '<span class="prediction-quick-value">' + (quickStats.followUpRegularity.isRegular === true ? 'Regular' : (quickStats.followUpRegularity.isRegular === false ? 'Irregular' : '—')) + '</span>';
    html += '</div></div>';

    // Per-model skeleton placeholders (for progressive replacement)
    html += '<div id="pred-card-seizureFreedom" class="prediction-section prediction-skeleton-section">';
    html += '<div class="prediction-skeleton prediction-skeleton-title"></div>';
    html += '<div class="prediction-skeleton prediction-skeleton-text"></div>';
    html += '<div class="prediction-skeleton prediction-skeleton-chart"></div>';
    html += '</div>';

    html += '<div class="prediction-grid-2col">';
    html += '<div id="pred-card-dreRisk" class="prediction-section prediction-skeleton-section"><div class="prediction-skeleton prediction-skeleton-title"></div><div class="prediction-skeleton prediction-skeleton-gauge"></div></div>';
    html += '<div id="pred-card-sudepRisk" class="prediction-section prediction-skeleton-section"><div class="prediction-skeleton prediction-skeleton-title"></div><div class="prediction-skeleton prediction-skeleton-gauge"></div></div>';
    html += '</div>';

    html += '<div id="pred-card-adherence" class="prediction-section prediction-skeleton-section">';
    html += '<div class="prediction-skeleton prediction-skeleton-title"></div>';
    html += '<div class="prediction-skeleton prediction-skeleton-text"></div>';
    html += '</div>';

    html += '<div id="pred-card-treatmentResponse" class="prediction-section prediction-skeleton-section">';
    html += '<div class="prediction-skeleton prediction-skeleton-title"></div>';
    html += '<div class="prediction-skeleton prediction-skeleton-text"></div>';
    html += '</div>';

    // Placeholder for supplementary sections (KM, drug comp, outcome validation)
    html += '<div id="pred-outcome-validation-area"></div>';

    // Disclaimer
    html += '<div class="prediction-disclaimer">';
    html += '<strong>Clinical Disclaimer:</strong> Predictions are loading...';
    html += '</div>';

    html += '</div>';
    return html;
  }

  function _renderError(err, patient, followUps) {
    var html = '<div class="prediction-error-container">';
    html += '<div class="prediction-main-header">';
    html += '<h3 class="prediction-main-title"><span class="prediction-icon">&#x1F9E0;</span> Clinical Predictions</h3>';
    html += '</div>';

    html += '<div class="prediction-error-card">';
    html += '<div class="prediction-error-icon">&#x26A0;</div>';
    html += '<h4>Prediction Engine Unavailable</h4>';
    html += '<p>' + _esc(err.message || 'An unexpected error occurred while generating predictions.') + '</p>';
    html += '<button class="prediction-retry-btn" onclick="document.getElementById(\'predictionsContainer\') && renderPredictionsTab(document.getElementById(\'predictionsContainer\'), window._lastPredictionPatient, window._lastPredictionFollowUps)">Retry</button>';
    html += '</div>';

    // Render offline fallback if patient data available
    if (patient && followUps && typeof window.PredictionEngine.generateOfflinePredictions === 'function') {
      html += '<div class="prediction-offline-fallback">';
      html += '<h4>&#x1F4F4; Offline Estimates (lower confidence)</h4>';
      var offlineResult = window.PredictionEngine.generateOfflinePredictions(patient, followUps);
      if (offlineResult.predictions) {
        Object.keys(offlineResult.predictions).forEach(function(modelName) {
          var pred = offlineResult.predictions[modelName];
          if (pred.status === 'insufficient_data') return;
          html += '<div class="prediction-offline-card">';
          html += '<strong>' + _formatModelName(modelName) + ':</strong> ';
          if (pred.probabilityPercent !== undefined) {
            html += pred.probabilityPercent + '% ';
          }
          if (pred.riskLevel) html += pred.riskLevel + ' ';
          if (pred.predictedAdherence) html += pred.predictedAdherence + ' ';
          html += '<span class="prediction-badge prediction-badge-warning">offline estimate</span>';
          html += '</div>';
        });
      }
      html += '</div>';
    }

    // Partial local data
    html += '<div class="prediction-section">';
    html += '<h4 class="prediction-section-title">Local Data Summary</h4>';

    var quickStats = window.PredictionDataPrep.computeQuickStats(patient, followUps);
    html += '<div class="prediction-quick-stats">';
    html += '<div class="prediction-quick-stat"><span class="prediction-quick-label">Seizure Trend</span><span class="prediction-quick-value">' + _capitalize(quickStats.seizureTrend.direction) + '</span></div>';
    html += '<div class="prediction-quick-stat"><span class="prediction-quick-label">Avg Seizures</span><span class="prediction-quick-value">' + (quickStats.seizureTrend.average !== null ? Math.round(quickStats.seizureTrend.average * 10) / 10 : '—') + '</span></div>';
    html += '<div class="prediction-quick-stat"><span class="prediction-quick-label">Adherence</span><span class="prediction-quick-value">' + _capitalize(quickStats.adherenceHistory.direction) + '</span></div>';
    html += '<div class="prediction-quick-stat"><span class="prediction-quick-label">Follow-ups</span><span class="prediction-quick-value">' + quickStats.followUpCount + '</span></div>';
    html += '</div>';

    html += '<div class="prediction-chart-container">';
    html += '<canvas id="predictionLocalSeizureChart"></canvas>';
    html += '</div>';

    html += '</div></div>';
    return html;
  }

  function _renderInsufficientData(sufficiency, patient) {
    var html = '<div class="prediction-insufficient">';
    html += '<div class="prediction-main-header">';
    html += '<h3 class="prediction-main-title"><span class="prediction-icon">&#x1F9E0;</span> Clinical Predictions</h3>';
    html += '</div>';

    html += '<div class="prediction-empty-state">';
    html += '<div class="prediction-empty-icon">&#x1F4CA;</div>';
    html += '<h4>More Data Needed</h4>';
    html += '<p>' + _esc(sufficiency.message) + '</p>';
    html += '<div class="prediction-empty-progress">';
    var progress = Math.min(100, Math.round((sufficiency.followUpCount / 2) * 100));
    html += '<div class="prediction-empty-progress-bar"><div class="prediction-empty-progress-fill" style="width:' + progress + '%"></div></div>';
    html += '<span>' + sufficiency.followUpCount + ' follow-ups available</span>';
    html += '</div>';

    // Per-model requirements
    if (sufficiency.perModel) {
      html += '<div class="prediction-per-model-reqs">';
      html += '<h5>Per-Model Requirements:</h5>';
      html += '<table class="prediction-table"><thead><tr><th>Model</th><th>Follow-ups</th><th>Days</th><th>Status</th></tr></thead><tbody>';
      Object.keys(sufficiency.perModel).forEach(function(m) {
        var pm = sufficiency.perModel[m];
        var color = pm.sufficient ? 'success' : 'danger';
        html += '<tr>';
        html += '<td>' + _formatModelName(m) + '</td>';
        html += '<td>' + pm.currentFollowUps + '/' + pm.required + '</td>';
        html += '<td>' + pm.currentDays + '/' + pm.requiredDays + '</td>';
        html += '<td><span class="prediction-badge prediction-badge-' + color + '">' + (pm.sufficient ? '✓ Ready' : '✗ Need more') + '</span></td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      html += '</div>';
    }

    html += '</div></div>';
    return html;
  }

  // ──────────────────────────────────────────────────────────────────
  // §9  Table Renderers
  // ──────────────────────────────────────────────────────────────────

  function _renderFeatureTable(features) {
    if (!features || features.length === 0) return '';
    var html = '<table class="prediction-table"><thead><tr><th>Feature</th><th>Value</th><th>Impact</th><th>Weight</th><th>Contribution</th></tr></thead><tbody>';
    features.forEach(function(f) {
      var impactClass = f.impact === 'positive' ? 'prediction-impact-positive' : (f.impact === 'negative' ? 'prediction-impact-negative' : 'prediction-impact-neutral');
      var contribPct = f.contributionPercent || 0;
      var contribDir = f.contributionDirection === 'positive' ? '↑' : (f.contributionDirection === 'negative' ? '↓' : '–');
      html += '<tr>';
      html += '<td><strong>' + _esc(f.name || '') + '</strong>';
      if (f.description) html += '<br><small class="prediction-feature-desc">' + _esc(f.description) + '</small>';
      html += '</td>';
      html += '<td>' + _esc(String(f.value || '')) + '</td>';
      html += '<td class="' + impactClass + '">' + _capitalize(f.impact || 'neutral') + '</td>';
      html += '<td>' + (f.weight || 0) + '</td>';
      html += '<td>';
      if (contribPct > 0) {
        html += '<div class="prediction-contrib-bar" title="' + contribPct + '% contribution">';
        html += '<div class="prediction-contrib-fill prediction-contrib-' + (f.contributionDirection === 'positive' ? 'pos' : 'neg') + '" style="width:' + Math.min(contribPct, 100) + '%"></div>';
        html += '<span class="prediction-contrib-label">' + contribDir + ' ' + contribPct + '%</span>';
        html += '</div>';
      } else {
        html += '–';
      }
      html += '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function _renderCriteriaTable(criteria) {
    if (!criteria || criteria.length === 0) return '';
    var html = '<table class="prediction-table"><thead><tr><th>Criterion</th><th>Status</th><th>Detail</th><th>Points</th></tr></thead><tbody>';
    criteria.forEach(function(c) {
      var statusIcon = c.met ? '&#x2705;' : '&#x274C;';
      html += '<tr>';
      html += '<td>' + _esc(c.criterion || '') + '</td>';
      html += '<td>' + statusIcon + '</td>';
      html += '<td>' + _esc(c.detail || '') + '</td>';
      html += '<td>' + (c.points || 0) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function _renderSUDEPFactorTable(factors) {
    if (!factors || factors.length === 0) return '';
    var html = '<table class="prediction-table"><thead><tr><th>Factor</th><th>Present</th><th>Weight</th><th>Score</th><th>Type</th><th>Recommendation</th></tr></thead><tbody>';
    factors.forEach(function(f) {
      var presentIcon = f.present ? '&#x2705;' : '&#x2796;';
      html += '<tr class="' + (f.present ? 'prediction-factor-present' : '') + '">';
      html += '<td>' + _esc(f.factor || '') + '</td>';
      html += '<td>' + presentIcon + '</td>';
      html += '<td><small>' + _esc(f.weight || '') + '</small></td>';
      html += '<td>' + f.score + '/' + f.maxScore + '</td>';
      html += '<td>' + (f.modifiable ? '<span class="prediction-badge prediction-badge-tiny prediction-badge-warning">Modifiable</span>' : '<span class="prediction-badge prediction-badge-tiny prediction-badge-muted">Fixed</span>') + '</td>';
      html += '<td><small>' + _esc(f.recommendation || '') + '</small></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  // ──────────────────────────────────────────────────────────────────
  // §10  Helpers
  // ──────────────────────────────────────────────────────────────────

  function _initializeExpandCollapse(container) {
    if (!container) return;
    var buttons = container.querySelectorAll('.prediction-expand-btn');
    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var targetId = btn.getAttribute('data-target');
        var panel = document.getElementById(targetId);
        if (!panel) return;
        var isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        btn.innerHTML = (isVisible ? '&#x25BC;' : '&#x25B2;') + ' ' + btn.textContent.replace(/[▼▲]\s*/, '');
      });
    });
  }

  function _destroyChart(id) {
    if (_predictionCharts[id]) {
      try { _predictionCharts[id].destroy(); } catch (e) {}
      delete _predictionCharts[id];
    }
  }

  function _destroyAllPredictionCharts() {
    Object.keys(_predictionCharts).forEach(function(id) {
      _destroyChart(id);
    });
  }

  function _esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  function _capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function _riskLevelToColor(level) {
    if (!level) return 'muted';
    switch (level.toLowerCase()) {
      case 'very-high': return 'danger';
      case 'high': return 'danger';
      case 'moderate': return 'warning';
      case 'low': return 'success';
      default: return 'muted';
    }
  }

  function _formatRiskLevel(level) {
    if (!level) return 'Unknown';
    return level.replace(/-/g, ' ').split(' ').map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }

  function _trajectoryColor(trajectory) {
    switch (trajectory) {
      case 'excellent': return 'success';
      case 'improving': return 'success';
      case 'typical': return 'info';
      case 'suboptimal': return 'warning';
      case 'worsening': return 'danger';
      default: return 'muted';
    }
  }

  function _formatTrajectory(trajectory) {
    if (!trajectory) return 'Unknown';
    return trajectory.replace(/-/g, ' ').split(' ').map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }

  function _formatTimestamp(isoStr) {
    if (!isoStr) return '';
    try {
      var d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoStr;
    }
  }

  function _formatShortDate(val) {
    if (!val) return '';
    try {
      var d = val instanceof Date ? val : new Date(String(val));
      if (isNaN(d.getTime())) return String(val).substring(0, 10);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch (e) {
      return String(val).substring(0, 10);
    }
  }

  function _parseDateSafe(val) {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    var d = new Date(String(val));
    return isNaN(d.getTime()) ? null : d;
  }

})();
