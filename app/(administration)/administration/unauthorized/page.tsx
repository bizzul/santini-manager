// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold mb-4">Unauthorized Access</h1>
      <p className="text-gray-600">
        You don&apos;t have permission to access this area. Please contact your
        administrator.
      </p>
    </div>
  );
}
