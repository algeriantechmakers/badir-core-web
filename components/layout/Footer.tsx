import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import NewsletterSignup from "@/components/pages/NewsletterSignup";

export default async function Footer() {
  const currentYear = new Date().getFullYear();
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <footer dir="rtl">
      <div className="flex-center mb-16 justify-center gap-4" dir="ltr">
        <a
          href="https://www.linkedin.com/company/bunian-%D8%A8%D9%86%D9%8A%D8%A7%D9%86/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/images/logos/bunian.png"
            alt="Badir and Bunian logos"
            width={160}
            height={40}
            quality={100}
            className="h-auto w-auto object-contain"
          />
        </a>
        <div className="bg-neutrals-100 h-10 w-0.5" />
        <Image
          src="/images/logos/logo-white.png"
          alt="Badir and Bunian logos"
          width={160}
          height={40}
          quality={100}
          className="h-auto w-auto object-contain"
        />
      </div>
      <div className="mx-auto max-w-7xl">
        {/* Main Footer Content */}
        <div className="mb-8 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* First column */}
          <div>
            <h3 className="mb-4 text-xl font-bold text-white">المنصة</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  عن المنصة
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  كيف تعمل
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  الأسئلة الشائعة
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  تواصل معنا
                </Link>
              </li>
            </ul>
          </div>

          {/* Middle column */}
          <div>
            <h3 className="mb-4 text-xl font-bold text-white">للمتطوعين</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/initiatives"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  ابحث عن مبادرات
                </Link>
              </li>
              <li>
                <Link
                  href="/signup/user"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  انضم كمتطوع
                </Link>
              </li>
              <li>
                <Link
                  href="/volunteer-guide"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  دليل المتطوع
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  شروط الاستخدام
                </Link>
              </li>
            </ul>
          </div>

          {/* Left Column - For Volunteers */}
          <div className="flex-center h-full items-end">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/assistance"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  ابحث عن مساعدات
                </Link>
              </li>
              <li>
                <Link
                  href="/signup/organization"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  انضم كمنظمة{" "}
                </Link>
              </li>
              <li>
                <Link
                  href="/organization-guide"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  دليل المنظمة
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-neutrals-200 text-sm transition-colors duration-200 hover:text-white"
                >
                  سياسة الخصوصية
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Section */}
          <div className="space-y-4 md:col-span-1">
            <h3 className="mb-4 text-xl font-bold text-white">
              جريدتنا الإلكترونية
            </h3>
            <p className="text-neutrals-200 mb-4 text-sm">
              احصل على آخر المواضيع والأخبار في بريدك
            </p>

            <NewsletterSignup initialEmail={session?.user.email} />
          </div>
        </div>

        {/* Divider */}
        <div className="bg-neutrals-100 my-8 h-0.5" />

        {/* Bottom Section */}
        <div className="flex w-full flex-col items-center justify-between gap-4 md:flex-row">
          {/* Copyright */}
          <div className="text-neutrals-400 text-center text-sm">
            © {currentYear} منصة بادر - جميع الحقوق محفوظة
          </div>
          <div className="text-neutrals-300 text-center text-sm">
            <a
              href="https://github.com/algerian-tech-makers/Badir"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutrals-400 flex items-center gap-2 text-sm transition-colors duration-200 hover:text-white"
            >
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              للمساهمة
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
