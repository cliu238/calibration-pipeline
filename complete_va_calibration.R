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
  plot_it = FALSE
)

# Step 5: Display results
cat("\nResults:\n")
print(calib_insilicova)
cat("\n")
summary(calib_insilicova, top = 5)
