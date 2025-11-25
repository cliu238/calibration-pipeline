#!/usr/bin/env Rscript
# Helper script to prepare calibration data and save it for later use
# This runs steps 1-3 and saves the output for use in calibration_only mode

library(openVA)
library(vacalibration)

# Parse command line arguments
args <- commandArgs(trailingOnly = TRUE)

# Default parameters
dataset_path <- NULL
data_type <- "WHO2016"
nsim <- 1000
output_path <- "calibration_data.rds"

# Parse arguments (format: --key=value)
for (arg in args) {
  if (grepl("^--dataset=", arg)) {
    dataset_path <- sub("^--dataset=", "", arg)
  } else if (grepl("^--data_type=", arg)) {
    data_type <- sub("^--data_type=", "", arg)
  } else if (grepl("^--nsim=", arg)) {
    nsim <- as.integer(sub("^--nsim=", "", arg))
  } else if (grepl("^--output=", arg)) {
    output_path <- sub("^--output=", "", arg)
  }
}

cat("VA Calibration Data Preparation\n")
cat("Parameters: data_type=", data_type, ", nsim=", nsim, "\n", sep="")
cat("Output will be saved to:", output_path, "\n\n")

# Step 1: Load dataset
if (is.null(dataset_path)) {
  cat("Using sample dataset: NeonatesVA5\n")
  data(NeonatesVA5)
  va_data <- NeonatesVA5
} else {
  cat("Loading dataset from:", dataset_path, "\n")
  va_data <- read.csv(dataset_path)
}
cat("Loaded:", nrow(va_data), "deaths\n\n")

# Step 2: Run InSilicoVA
cat("Running InSilicoVA (this may take a while)...\n")
fit_insilicova <- codeVA(va_data, data.type = data_type, Nsim = nsim)
cat("InSilicoVA completed\n\n")

# Step 3: Prepare for calibration
cat("Preparing calibration data...\n")
insilicova_prep <- prepCalibration(fit_insilicova)

# Save the prepared data
cat("Saving prepared calibration data to:", output_path, "\n")
saveRDS(insilicova_prep, output_path)

cat("\nDone! You can now use this file with calibration_only mode.\n")
cat("Example: Rscript calibration_only.R --calib_data=", output_path, " --country=Mozambique --age_group=neonate\n", sep="")
