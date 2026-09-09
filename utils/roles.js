export const ROLES = {
  FARMER: "farmer",
  DEALER: "dealer",
  AGRI_OFFICER: "agri_officer",
  ADMIN: "admin",
  BUYER: "buyer",
  MACHINERY_OWNER: "machinery_owner",
};

// ponytail: buyer/machinery_owner are farmer-equivalent for auth; add when real RBAC needed
export const PUBLIC_REGISTERABLE_ROLES = [ROLES.FARMER, ROLES.DEALER, ROLES.BUYER, ROLES.MACHINERY_OWNER];

export const DEALER_OR_OFFICER = [ROLES.DEALER, ROLES.AGRI_OFFICER];

export const FARMER_LIKE = [ROLES.FARMER, ROLES.BUYER, ROLES.MACHINERY_OWNER];

export const AUTH_ROLES = [ROLES.FARMER, ROLES.DEALER, ROLES.AGRI_OFFICER, ROLES.ADMIN, ROLES.BUYER, ROLES.MACHINERY_OWNER];

export const authorize = (...allowedRoles) => {
 return (req, res, next) => {
 if (!req.user) {
 return res.status(401).json({ success: false, message: "Not authenticated." });
 }
 if (!allowedRoles.includes(req.user.role)) {
 return res.status(403).json({ success: false, message: "Not authorized to access this resource." });
 }
 next();
 };
};
