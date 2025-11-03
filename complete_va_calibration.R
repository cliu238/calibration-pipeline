#!/usr/bin/env Rscript
# Complete VA Calibration Example
# Following: https://cran.r-project.org/web/packages/openVA/vignettes/vacalibration-vignette.html

# Install packages if needed (uncomment to run)
# install.packages(c("openVA", "vacalibration"))

library(openVA)
library(vacalibration)

cat("VA Calibration Pipeline\n\n")

# Step 1: Load dataset
data(NeonatesVA5)
cat("Loaded:", dim(NeonatesVA5)[1], "deaths\n")

# Step 2: Run InSilicoVA
cat("Running InSilicoVA...\n")
fit_insilicova <- codeVA(NeonatesVA5, data.type = "WHO2016", Nsim = 1000)

# Step 3: Prepare for calibration
insilicova_prep <- prepCalibration(fit_insilicova)

# Step 4: Run calibration
cat("Calibrating (Mozambique, neonate)...\n")
calib_insilicova <- vacalibration::vacalibration(
  va_data = insilicova_prep,
  age_group = "neonate",
  country = "Mozambique",
  plot_it = FALSE
)

# Step 5: Display results
cat("\nResults:\n")
print(calib_insilicova)
cat("\n")
summary(calib_insilicova, top = 5)
