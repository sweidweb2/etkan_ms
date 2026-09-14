import { createStaffHomeRedirect } from "@/lib/auth/staff-home-redirect";
import { ROLES } from "@/lib/constants/roles";

export default createStaffHomeRedirect(ROLES.SUPERVISOR);
