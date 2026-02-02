import * as yup from "yup";

// Validation schema for Step 1
export const step1ValidationSchema = yup.object().shape({
  schoolName: yup
    .string()
    .required("School name is required")
    .min(2, "School name must be at least 2 characters"),
  address: yup
    .string()
    .required("Address is required")
    .min(5, "Address must be at least 5 characters"),
  phoneNumber: yup
    .string()
    .required("Phone number is required")
    .test("starts-with-7", "Phone number must start with 7", (value) => {
      return value ? value.startsWith("7") : false;
    })
    .test("exact-length", "Phone number must be exactly 9 digits", (value) => {
      return value ? value.length === 9 : false;
    })
    .matches(/^\d+$/, "Phone number must contain only digits"),
  email: yup
    .string()
    .required("Email is required")
    .email("Must be a valid email address"),
});

// Validation schema for Step 2
export const step2ValidationSchema = yup.object().shape({
  curriculum: yup
    .object()
    .shape({
      cambridge: yup.boolean(),
      zimsec: yup.boolean(),
    })
    .test("at-least-one", "Select at least one curriculum", (value) => {
      return value?.cambridge || value?.zimsec;
    }),
  educationLevels: yup
    .object()
    .shape({
      primary: yup.boolean(),
      secondary: yup.boolean(),
    })
    .test("at-least-one", "Select at least one education level", (value) => {
      return value?.primary || value?.secondary;
    }),
  subjects: yup
    .array()
    .of(
      yup.object().shape({
        name: yup
          .string()
          .required("Subject name is required")
          .min(2, "Subject name must be at least 2 characters"),
        level: yup
          .string()
          .required("Subject level is required"),
      })
    )
    .min(1, "Add at least one subject"),
});

// Validation schema for Step 3 (placeholder)
export const step3ValidationSchema = yup.object().shape({
  classes: yup
    .array()
    .of(
      yup.object().shape({
        name: yup
          .string()
          .required("Class name is required")
          .min(1, "Class name must be at least 1 character"),
        capacity: yup
          .number()
          .required("Capacity is required")
          .min(1, "Capacity must be at least 1")
          .max(200, "Capacity cannot exceed 200"),
      })
    )
    .min(1, "Add at least one class"),
});

// Validation schema for Step 4 (placeholder)
export const step4ValidationSchema = yup.object().shape({});
