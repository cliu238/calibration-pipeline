#!/usr/bin/env Rscript
# VA Ensemble Calibration
# Combines multiple VA algorithm outputs (EAVA, InSilicoVA, InterVA) for ensemble calibration

library(vacalibration)

# DEBUG: Print function signature
cat("\n=== DEBUG: vacalibration function signature ===\n")
print(args(vacalibration::vacalibration))
cat("=== END DEBUG ===\n\n")

# Parse command line arguments
args <- commandArgs(trailingOnly = TRUE)

# Default parameters
eava_path <- NULL
insilicova_path <- NULL
interva_path <- NULL
age_group <- "neonate"
country <- "Mozambique"
# vacalibration parameters (OLD API: calibmodel.type, stable)
calibmodel_type <- "Mmatprior"  # "Mmatprior" or "Mmatfixed"
stable <- TRUE
nMCMC <- 5000
nBurn <- 5000
nThin <- 1
seed <- 1
verbose <- TRUE
saveoutput <- FALSE
plot_it <- FALSE
ensemble <- TRUE  # Enable ensemble calibration

# Parse arguments (format: --key=value)
for (arg in args) {
  if (grepl("^--eava=", arg)) {
    eava_path <- sub("^--eava=", "", arg)
  } else if (grepl("^--insilicova=", arg)) {
    insilicova_path <- sub("^--insilicova=", "", arg)
  } else if (grepl("^--interva=", arg)) {
    interva_path <- sub("^--interva=", "", arg)
  } else if (grepl("^--age_group=", arg)) {
    age_group <- sub("^--age_group=", "", arg)
  } else if (grepl("^--country=", arg)) {
    country <- sub("^--country=", "", arg)
  } else if (grepl("^--mmat_type=", arg)) {
    # OLD API: Map frontend values to calibmodel.type values
    val <- sub("^--mmat_type=", "", arg)
    calibmodel_type <- if (val == "prior") "Mmatprior" else if (val == "fixed") "Mmatfixed" else val
  } else if (grepl("^--path_correction=", arg)) {
    # OLD API uses "stable" parameter
    stable <- as.logical(sub("^--path_correction=", "", arg))
  } else if (grepl("^--nMCMC=", arg)) {
    nMCMC <- as.integer(sub("^--nMCMC=", "", arg))
  } else if (grepl("^--nBurn=", arg)) {
    nBurn <- as.integer(sub("^--nBurn=", "", arg))
  } else if (grepl("^--nThin=", arg)) {
    nThin <- as.integer(sub("^--nThin=", "", arg))
  } else if (grepl("^--nChain=", arg)) {
    # v2.0 doesn't support nChain - ignore
  } else if (grepl("^--nCore=", arg)) {
    # v2.0 doesn't support nCore - ignore
  } else if (grepl("^--seed=", arg)) {
    seed <- as.integer(sub("^--seed=", "", arg))
  } else if (grepl("^--verbose=", arg)) {
    verbose <- as.logical(sub("^--verbose=", "", arg))
  } else if (grepl("^--saveoutput=", arg)) {
    saveoutput <- as.logical(sub("^--saveoutput=", "", arg))
  } else if (grepl("^--plot_it=", arg)) {
    plot_it <- as.logical(sub("^--plot_it=", "", arg))
  } else if (grepl("^--ensemble=", arg)) {
    ensemble <- as.logical(sub("^--ensemble=", "", arg))
  }
}

cat("VA Ensemble Calibration Mode\n")
cat("Parameters: country=", country, ", age_group=", age_group, "\n", sep="")
cat("Algorithms provided:\n")

# Helper function to filter out undetermined cases (rows with more than 1 non-zero value)
# vacalibration requires single-cause predictions: exactly one non-zero value per row
filter_undetermined <- function(data, algo_name) {
  # Check each row: count non-zero values
  non_zero_counts <- apply(data, 1, function(v) sum(v != 0))
  valid_rows <- non_zero_counts == 1
  n_removed <- sum(!valid_rows)

  if (n_removed > 0) {
    cat("    Removed", n_removed, "undetermined cases from", algo_name, "\n")
  }

  return(data[valid_rows, , drop = FALSE])
}

# Build the va_data list with available algorithms
va_data_list <- list()
algorithms_used <- c()

if (!is.null(eava_path) && file.exists(eava_path)) {
  cat("  - EAVA:", eava_path, "\n")
  eava_data <- readRDS(eava_path)
  va_data_list[["eava"]] <- filter_undetermined(eava_data, "eava")
  algorithms_used <- c(algorithms_used, "eava")
}

if (!is.null(insilicova_path) && file.exists(insilicova_path)) {
  cat("  - InSilicoVA:", insilicova_path, "\n")
  insilicova_data <- readRDS(insilicova_path)
  va_data_list[["insilicova"]] <- filter_undetermined(insilicova_data, "insilicova")
  algorithms_used <- c(algorithms_used, "insilicova")
}

if (!is.null(interva_path) && file.exists(interva_path)) {
  cat("  - InterVA:", interva_path, "\n")
  interva_data <- readRDS(interva_path)
  va_data_list[["interva"]] <- filter_undetermined(interva_data, "interva")
  algorithms_used <- c(algorithms_used, "interva")
}

# Validate at least one algorithm is provided
if (length(va_data_list) == 0) {
  stop("ERROR: At least one algorithm data file is required (--eava, --insilicova, or --interva)")
}

cat("\nLoaded", length(va_data_list), "algorithm(s) for ensemble calibration\n")

# Get death counts from each algorithm (may differ due to undetermined filtering)
n_deaths_by_algo <- sapply(va_data_list, nrow)
cat("Deaths per algorithm:", paste(names(n_deaths_by_algo), n_deaths_by_algo, sep="=", collapse=", "), "\n")

# Use minimum death count for reporting (intersection of valid cases)
n_deaths <- min(n_deaths_by_algo)
cat("Total valid deaths for calibration:", n_deaths, "\n\n")

# Run ensemble calibration
cat("Running ensemble calibration (", country, ", ", age_group, ")...\n", sep="")
calib_result <- vacalibration::vacalibration(
  va_data = va_data_list,
  age_group = age_group,
  country = country,
  calibmodel.type = calibmodel_type,
  stable = stable,
  nMCMC = nMCMC,
  nBurn = nBurn,
  nThin = nThin,
  seed = seed,
  verbose = verbose,
  saveoutput = saveoutput,
  plot_it = plot_it,
  ensemble = ensemble
)

# Display results
cat("\nEnsemble Calibration Results:\n")
print(calib_result)
cat("\n")
summary(calib_result, top = 5)

# Output structured JSON for API consumption
library(jsonlite)

# Extract results - handling ensemble output structure
# For ensemble, p_calib is a 3D array: [algorithm, iteration, cause]
# We need to extract ensemble results specifically

# Get cause names
cause_names <- dimnames(calib_result$p_calib)[[3]]
if (is.null(cause_names)) {
  n_causes <- dim(calib_result$p_calib)[3]
  cause_names <- paste0("cause_", 1:n_causes)
}

# Extract algorithm names from the result
algo_names <- dimnames(calib_result$p_calib)[[1]]

# Build results for each algorithm and ensemble
algorithm_results <- list()

for (algo in algo_names) {
  # Get calibrated CSMF for this algorithm (mean across MCMC samples)
  algo_p_calib <- calib_result$p_calib[algo, , ]
  if (is.matrix(algo_p_calib)) {
    algo_calib_csmf <- colMeans(algo_p_calib)
  } else {
    algo_calib_csmf <- algo_p_calib
  }

  # Get uncalibrated CSMF if available
  # Note: p_uncalib is a matrix with algorithms as rows and causes as columns
  if (!is.null(calib_result$p_uncalib) && is.matrix(calib_result$p_uncalib) && algo %in% rownames(calib_result$p_uncalib)) {
    algo_uncalib_csmf <- calib_result$p_uncalib[algo, ]
  } else if (!is.null(calib_result$p_uncalib) && is.numeric(calib_result$p_uncalib) && !is.matrix(calib_result$p_uncalib)) {
    algo_uncalib_csmf <- calib_result$p_uncalib
  } else {
    algo_uncalib_csmf <- rep(NA, length(algo_calib_csmf))
  }

  # Get all causes (sorted by calibrated CSMF)
  top_n <- length(algo_calib_csmf)
  top_indices <- order(algo_calib_csmf, decreasing = TRUE)[1:top_n]

  algorithm_results[[algo]] <- list(
    algorithm = algo,
    top_causes = lapply(top_indices, function(i) {
      list(
        cause = cause_names[i],
        calibrated_csmf = round(algo_calib_csmf[i], 4),
        uncalibrated_csmf = if (!is.na(algo_uncalib_csmf[i])) round(algo_uncalib_csmf[i], 4) else NULL
      )
    })
  )
}

# Build final JSON result
result_json <- list(
  mode = "ensemble",
  country = country,
  age_group = age_group,
  n_deaths = n_deaths,
  algorithms_used = algorithms_used,
  algorithm_results = algorithm_results,
  summary = list(
    total_causes = length(cause_names),
    total_algorithms = length(algo_names),
    has_ensemble = "ensemble" %in% algo_names,
    calibrated = as.logical(calib_result$calibrated)
  )
)

cat("\n___JSON_RESULT_START___\n")
cat(toJSON(result_json, pretty = TRUE, auto_unbox = FALSE))
cat("\n___JSON_RESULT_END___\n")
