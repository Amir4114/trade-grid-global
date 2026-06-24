import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="w-full bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">

        {/* BADGE */}
        <div className="mb-6 rounded-full border px-4 py-2 text-sm font-medium text-gray-600">
          Verified Global Suppliers • RFQ Marketplace • Trusted Trade
        </div>

        {/* HEADING */}
        <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight text-black md:text-6xl">
          Source Trusted Food & FMCG Suppliers Worldwide
        </h1>

        {/* SUBTEXT */}
        <p className="mt-6 max-w-2xl text-lg text-gray-600">
          Connect with verified exporters, manufacturers, and wholesalers across
          GCC, MENA, Asia, and global trade markets.
        </p>

        {/* ACTIONS */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button className="px-8 py-6 text-base">
            Post RFQ
          </Button>

          <Button
            variant="outline"
            className="px-8 py-6 text-base"
          >
            Explore Products
          </Button>
        </div>

        {/* TRUST STATS */}
        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-3xl font-bold">5K+</h3>
            <p className="text-sm text-gray-500">
              Verified Suppliers
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-bold">120+</h3>
            <p className="text-sm text-gray-500">
              Countries Connected
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-bold">25K+</h3>
            <p className="text-sm text-gray-500">
              Products Listed
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-bold">24/7</h3>
            <p className="text-sm text-gray-500">
              RFQ Support
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}