import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const ADMIN_ONLY_KEY = 'adminOnly';

/** Marks a route as reachable without an access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Requires an admin token issued by /admin/auth/login. */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);
