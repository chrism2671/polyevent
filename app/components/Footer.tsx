export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="px-4 py-6">
        <div className="flex justify-center gap-6 text-sm">
          <a
            href="https://chriscentral.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ChrisCentral
          </a>
          <span className="text-gray-300">•</span>
          <a
            href="https://linklyhq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Linkly
          </a>
          <span className="text-gray-300">•</span>
          <a
            href="https://userbird.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Userbird
          </a>
        </div>
      </div>
    </footer>
  );
}
