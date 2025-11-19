#!/usr/bin/env Rscript
# VA Calibration Only (Steps 4-5)
# Use this when you already have prepared calibration data from InSilicoVA

library(vacalibration)

# Parse command line arguments
args <- commandArgs(trailingOnly = TRUE)

# Default parameters
calib_data_path <- NULL
age_group <- "neonate"
country <- "Mozambique"

# Parse arguments (format: --key=value)
for (arg in args) {
  if (grepl("^--calib_data=", arg)) {
    calib_data_path <- sub("^--calib_data=", "", arg)
  } else if (grepl("^--age_group=", arg)) {
    age_group <- sub("^--age_group=", "", arg)
  } else if (grepl("^--country=", arg)) {
    country <- sub("^--country=", "", arg)
  }
}

cat("VA Calibration Only Mode\n")
cat("Parameters: country=", country, ", age_group=", age_group, "\n\n", sep="")

# Validate required parameter
if (is.null(calib_data_path)) {
  stop("ERROR: --calib_data parameter is required for calibration-only mode")
}

# Load prepared calibration data
cat("Loading calibration data from:", calib_data_path, "\n")
if (!file.exists(calib_data_path)) {
  stop("ERROR: Calibration data file not found: ", calib_data_path)
}
insilicova_prep <- readRDS(calib_data_path)

# Step 4: Run calibration
cat("Running calibration (", country, ", ", age_group, ")...\n", sep="")
calib_result <- vacalibration::vacalibration(
  va_data = insilicova_prep,
  age_group = age_group,
  country = country,
  plot_it = FALSE
)

# Step 5: Display results
cat("\nCalibration Results:\n")
print(calib_result)
cat("\n")
summary(calib_result, top = 5)

# Output structured JSON for API consumption
library(jsonlite)

# Extract calibrated and uncalibrated CSMFs
uncalib_csmf <- calib_result$p_uncalib
calib_csmf <- colMeans(matrix(calib_result$p_calib, ncol=length(uncalib_csmf)))
cause_names <- names(calib_result$p_uncalib)
if (is.null(cause_names)) {
  cause_names <- paste0("cause_", 1:length(uncalib_csmf))
}

# Get top 5 causes by calibrated CSMF
top_n <- min(5, length(calib_csmf))
top_indices <- order(calib_csmf, decreasing = TRUE)[1:top_n]

result_json <- list(
  mode = "calibration_only",
  country = country,
  age_group = age_group,
  top_causes = lapply(top_indices, function(i) {
    list(
      cause = cause_names[i],
      calibrated_csmf = round(calib_csmf[i], 4),
      uncalibrated_csmf = round(uncalib_csmf[i], 4)
    )
  }),
  summary = list(
    total_causes = length(calib_csmf),
    calibrated = as.logical(calib_result$calibrated)
  )
)

cat("\n___JSON_RESULT_START___\n")
cat(toJSON(result_json, pretty = TRUE, auto_unbox = FALSE))
cat("\n___JSON_RESULT_END___\n")
