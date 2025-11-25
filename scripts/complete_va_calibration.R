#!/usr/bin/env Rscript
# VA Calibration with Custom Dataset Support

library(openVA)
library(vacalibration)

# Parse command line arguments
args <- commandArgs(trailingOnly = TRUE)

# Default parameters
dataset_path <- NULL
data_type <- "WHO2016"
nsim <- 1000
age_group <- "neonate"
country <- "Mozambique"
# vacalibration parameters
mmat_type <- "prior"
path_correction <- TRUE
nMCMC <- 5000
nBurn <- 5000
nThin <- 1
nChain <- 1
nCore <- 1
seed <- 1
verbose <- TRUE
saveoutput <- FALSE
plot_it <- FALSE

# Parse arguments (format: --key=value)
for (arg in args) {
  if (grepl("^--dataset=", arg)) {
    dataset_path <- sub("^--dataset=", "", arg)
  } else if (grepl("^--data_type=", arg)) {
    data_type <- sub("^--data_type=", "", arg)
  } else if (grepl("^--nsim=", arg)) {
    nsim <- as.integer(sub("^--nsim=", "", arg))
  } else if (grepl("^--age_group=", arg)) {
    age_group <- sub("^--age_group=", "", arg)
  } else if (grepl("^--country=", arg)) {
    country <- sub("^--country=", "", arg)
  } else if (grepl("^--mmat_type=", arg)) {
    mmat_type <- sub("^--mmat_type=", "", arg)
  } else if (grepl("^--path_correction=", arg)) {
    path_correction <- as.logical(sub("^--path_correction=", "", arg))
  } else if (grepl("^--nMCMC=", arg)) {
    nMCMC <- as.integer(sub("^--nMCMC=", "", arg))
  } else if (grepl("^--nBurn=", arg)) {
    nBurn <- as.integer(sub("^--nBurn=", "", arg))
  } else if (grepl("^--nThin=", arg)) {
    nThin <- as.integer(sub("^--nThin=", "", arg))
  } else if (grepl("^--nChain=", arg)) {
    nChain <- as.integer(sub("^--nChain=", "", arg))
  } else if (grepl("^--nCore=", arg)) {
    nCore <- as.integer(sub("^--nCore=", "", arg))
  } else if (grepl("^--seed=", arg)) {
    seed <- as.integer(sub("^--seed=", "", arg))
  } else if (grepl("^--verbose=", arg)) {
    verbose <- as.logical(sub("^--verbose=", "", arg))
  } else if (grepl("^--saveoutput=", arg)) {
    saveoutput <- as.logical(sub("^--saveoutput=", "", arg))
  } else if (grepl("^--plot_it=", arg)) {
    plot_it <- as.logical(sub("^--plot_it=", "", arg))
  }
}

cat("VA Calibration Pipeline\n")
cat("Parameters: country=", country, ", age_group=", age_group, ", nsim=", nsim, "\n\n", sep="")

# Step 1: Load dataset
if (is.null(dataset_path)) {
  cat("Using sample dataset: NeonatesVA5\n")
  data(NeonatesVA5)
  va_data <- NeonatesVA5
} else {
  cat("Loading dataset from:", dataset_path, "\n")
  va_data <- read.csv(dataset_path)
}
cat("Loaded:", nrow(va_data), "deaths\n")

# Step 2: Run InSilicoVA
cat("Running InSilicoVA...\n")
fit_insilicova <- codeVA(va_data, data.type = data_type, Nsim = nsim)

# Step 3: Prepare for calibration
insilicova_prep <- prepCalibration(fit_insilicova)

# Step 4: Run calibration
cat("Calibrating (", country, ", ", age_group, ")...\n", sep="")
calib_insilicova <- vacalibration::vacalibration(
  va_data = insilicova_prep,
  age_group = age_group,
  country = country,
  Mmat_type = mmat_type,
  path_correction = path_correction,
  nMCMC = nMCMC,
  nBurn = nBurn,
  nThin = nThin,
  nChain = nChain,
  nCore = nCore,
  seed = seed,
  verbose = verbose,
  saveoutput = saveoutput,
  plot_it = plot_it
)

# Step 5: Display results
cat("\nResults:\n")
print(calib_insilicova)
cat("\n")
summary(calib_insilicova, top = 5)

# Output structured JSON for API consumption
library(jsonlite)

# Extract calibrated and uncalibrated CSMFs
uncalib_csmf <- calib_insilicova$p_uncalib
calib_csmf <- colMeans(matrix(calib_insilicova$p_calib, ncol=length(uncalib_csmf)))
cause_names <- names(calib_insilicova$p_uncalib)
if (is.null(cause_names)) {
  cause_names <- paste0("cause_", 1:length(uncalib_csmf))
}

# Get top 5 causes by calibrated CSMF
top_n <- min(5, length(calib_csmf))
top_indices <- order(calib_csmf, decreasing = TRUE)[1:top_n]

result_json <- list(
  mode = "full_pipeline",
  country = country,
  age_group = age_group,
  data_type = data_type,
  nsim = nsim,
  n_deaths = nrow(va_data),
  top_causes = lapply(top_indices, function(i) {
    list(
      cause = cause_names[i],
      calibrated_csmf = round(calib_csmf[i], 4),
      uncalibrated_csmf = round(uncalib_csmf[i], 4)
    )
  }),
  summary = list(
    total_causes = length(calib_csmf),
    calibrated = as.logical(calib_insilicova$calibrated)
  )
)

cat("\n___JSON_RESULT_START___\n")
cat(toJSON(result_json, pretty = TRUE, auto_unbox = FALSE))
cat("\n___JSON_RESULT_END___\n")
