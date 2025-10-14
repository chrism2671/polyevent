export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mt-auto">
      <div className="px-4 py-6">
        <div className="flex justify-center gap-6 text-sm">
          <a
            href="https://chriscentral.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            ChrisCentral
          </a>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <a
            href="https://linklyhq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Linkly
          </a>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <a
            href="https://userbird.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Userbird
          </a>
        </div>
      </div>
    </footer>
  );
}
