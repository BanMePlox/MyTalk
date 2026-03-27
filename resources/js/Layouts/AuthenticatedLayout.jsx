export default function AuthenticatedLayout({ children }) {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-800 flex flex-col">
            <main className="flex-1">{children}</main>
        </div>
    );
}
