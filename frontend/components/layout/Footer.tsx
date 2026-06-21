import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="text-lg font-bold text-brand-800">
              GameDay<span className="text-brand-600">Wire</span>
            </Link>
            <p className="mt-2 text-sm text-gray-600">
              Your daily source for original sports and entertainment analysis.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Categories</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/category/sports"
                  className="text-sm text-gray-600 hover:text-brand-600"
                >
                  Sports
                </Link>
              </li>
              <li>
                <Link
                  href="/category/entertainment"
                  className="text-sm text-gray-600 hover:text-brand-600"
                >
                  Entertainment
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Pages</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/page/about" className="text-sm text-gray-600 hover:text-brand-600">
                  About
                </Link>
              </li>
              <li>
                <Link href="/page/contact" className="text-sm text-gray-600 hover:text-brand-600">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/page/privacy-policy"
                  className="text-sm text-gray-600 hover:text-brand-600"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/page/terms" className="text-sm text-gray-600 hover:text-brand-600">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/page/disclaimer"
                  className="text-sm text-gray-600 hover:text-brand-600"
                >
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-200 pt-6">
          <p className="text-center text-sm text-gray-500">
            &copy; {currentYear} GameDayWire. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
