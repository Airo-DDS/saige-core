'use server';

// Placeholder actions file for auth
// The actual authentication is handled by Clerk

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

// These functions are placeholders since Clerk handles auth
export async function login(
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  console.log('Login called (handled by Clerk)', formData);
  return { status: 'success' };
}

export async function register(
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  console.log('Register called (handled by Clerk)', formData);
  return { status: 'success' };
}
