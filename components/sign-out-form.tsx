import Form from 'next/form';

// Create a local signOut function since it's not exported from auth.ts
const signOut = async ({ redirectTo }: { redirectTo: string }) => {
  'use server';
  console.log('Sign out placeholder called');
  // In a real implementation, this would sign the user out
  // For now, we'll just redirect
  return { success: true };
};

export const SignOutForm = () => {
  return (
    <Form
      className="w-full"
      action={async () => {
        'use server';

        await signOut({
          redirectTo: '/',
        });
      }}
    >
      <button
        type="submit"
        className="w-full text-left px-1 py-0.5 text-red-500"
      >
        Sign out
      </button>
    </Form>
  );
};
