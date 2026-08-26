export const ROLES = {
  FARMER: "farmer",
  BUYER: "buyer",
  DEALER: "dealer",
  MACHINERY_OWNER: "machinery_owner",
  AGRI_OFFICER: "agri_officer",
  ADMIN: "admin",
};

export const ALL_ROLES = Object.values(ROLES);

// Matches the Android app's Register screen exactly - admin and
// agri_officer are provisioned only via seed/seedAdmin.js, never through
// public self-registration.
export const PUBLIC_REGISTERABLE_ROLES = [
  ROLES.FARMER,
  ROLES.BUYER,
  ROLES.DEALER,
  ROLES.MACHINERY_OWNER,
];
