import * as React from "react";
import { Link } from "@tanstack/react-router";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 py-6">
      <div className="container mx-auto px-4">
        {/* Desktop Footer */}
        <div className="hidden lg:flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-primary font-semibold">BakBak</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">
              Record, transcribe, and study your language practice
            </span>
          </div>

          <div className="grid grid-cols-3 gap-x-16 text-xs">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Features
              </span>
              <ul className="flex flex-col space-y-1 mt-2 text-gray-500">
                <li>
                  <Link to="/" className="hover:text-primary">
                    Voice Recording
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary">
                    AI Transcription
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary">
                    Romanization
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Languages
              </span>
              <ul className="flex flex-col space-y-1 mt-2 text-gray-500">
                <li>
                  <Link to="/" className="hover:text-primary">
                    Hindi
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary">
                    Japanese
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary">
                    Korean
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary">
                    French
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary">
                    Spanish
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary">
                    German
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Company
              </span>
              <ul className="flex flex-col space-y-1 mt-2 text-gray-500">
                <li>
                  <Link to="/" className="hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mobile Footer - Minimal */}
        <div className="lg:hidden">
          <div className="flex flex-col space-y-4 py-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-1">
                <span className="text-primary text-sm font-semibold">
                  BakBak
                </span>
                <span className="text-xs text-gray-500">
                  &copy; {currentYear}
                </span>
              </div>

              <div className="flex space-x-4 text-xs text-gray-500">
                <Link to="/" className="hover:text-primary">
                  Privacy
                </Link>
                <Link to="/" className="hover:text-primary">
                  Terms
                </Link>
                <Link to="/" className="hover:text-primary">
                  Contact
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Features
                </span>
                <ul className="flex flex-col space-y-1 mt-1 text-gray-500">
                  <li>
                    <Link to="/" className="hover:text-primary">
                      Voice Recording
                    </Link>
                  </li>
                  <li>
                    <Link to="/" className="hover:text-primary">
                      AI Transcription
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Languages
                </span>
                <ul className="flex flex-col space-y-1 mt-1 text-gray-500">
                  <li>
                    <Link to="/" className="hover:text-primary">
                      Hindi
                    </Link>
                  </li>
                  <li>
                    <Link to="/" className="hover:text-primary">
                      Japanese
                    </Link>
                  </li>
                  <li>
                    <Link to="/" className="hover:text-primary">
                      Korean
                    </Link>
                  </li>
                  <li>
                    <Link to="/" className="hover:text-primary">
                      French
                    </Link>
                  </li>
                  <li>
                    <Link to="/" className="hover:text-primary">
                      Spanish
                    </Link>
                  </li>
                  <li>
                    <Link to="/" className="hover:text-primary">
                      German
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright - Desktop only */}
        <div className="hidden lg:block border-t border-gray-200 dark:border-gray-800 mt-3 pt-3 text-right text-gray-500 text-xs">
          <p>&copy; {currentYear} BakBak. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
