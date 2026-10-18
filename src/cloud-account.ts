import { createPlayerSaveStore } from './cloud-save.mjs';
import { createInternalNeonAuth } from '@neondatabase/auth';
import { BetterAuthVanillaAdapter } from '@neondatabase/auth/vanilla/adapters';
import { NeonPostgrestClient, fetchWithToken } from '@neondatabase/postgrest-js';

export type PlayerSave = Record<string, unknown>;
export type CloudUser = { id: string; name: string; email: string; image?: string | null };
function createVanillaAuthClient(url: string) { return createInternalNeonAuth(url, { adapter: BetterAuthVanillaAdapter() }); }
type AuthClient = ReturnType<typeof createVanillaAuthClient>;

const authUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim();
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL?.trim();
let auth: AuthClient | null = null;
let dataApi: NeonPostgrestClient | null = null;
let playerStore:ReturnType<typeof createPlayerSaveStore>|null=null;
function getStore(){return playerStore??=createPlayerSaveStore(getDataApi());}

export function cloudIsConfigured() { return Boolean(authUrl && dataApiUrl); }

function getAuth() {
  if (!cloudIsConfigured()) throw new Error('Add Neon Auth and Data API URLs to .env.local first.');
  if (!auth) auth = createVanillaAuthClient(authUrl!);
  return auth;
}

function getDataApi() {
  if (!dataApi) {
    const authClient = getAuth();
    dataApi = new NeonPostgrestClient({
      dataApiUrl: dataApiUrl!,
      options: { global: { fetch: fetchWithToken(async () => {
        return await authClient.getJWTToken();
      }) } },
    });
  }
  return dataApi;
}

export async function getCloudUser(): Promise<CloudUser | null> {
  if (!cloudIsConfigured()) return null;
  const result = await getAuth().adapter.getSession();
  if (result.error) throw new Error(result.error.message || 'Your account session could not be restored.');
  const user = result?.data?.user;
  return user?.id ? { id: user.id, name: user.name ?? 'Karachi Runner', email: user.email ?? '', image: user.image } : null;
}

export async function signInWithGoogle() {
  const result = await getAuth().adapter.signIn.social({
    provider: 'google',
    callbackURL: window.location.origin,
    errorCallbackURL: window.location.origin,
    requestSignUp: true,
    disableRedirect: true,
    additionalParams: { prompt: 'select_account consent' },
  });
  if (result.error) throw result.error;
  const url = result.data?.url;
  if (!url) throw new Error('Google did not return a sign-in URL. Check the Neon Auth Google provider settings.');
  window.location.assign(url);
}

export async function signOutCloud() {
  if (auth) { const result = await auth.adapter.signOut(); if (result.error) throw new Error(result.error.message || 'Sign-out failed.'); }
}

export async function loadCloudSave(userId: string): Promise<PlayerSave | null> {
  return getStore().load(userId);
}

export async function writeCloudSave(userId: string, save: PlayerSave) {
  return await getStore().write(userId, save);
}

export function cloudSaveVersion(userId:string){return getStore().version(userId);}
export async function claimCloudReward(userId:string,kind:string,key:string){return await getStore().claim(userId,kind,key);}
