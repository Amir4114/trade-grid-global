export default function TrustBanner() {
    return (
      <div className="mt-16 bg-black text-white rounded-3xl p-8 text-center">
        <h2 className="text-3xl font-bold">
          Trusted Global B2B Marketplace
        </h2>
  
        <p className="mt-4 text-gray-300 max-w-2xl mx-auto">
          Connect with verified buyers, suppliers, exporters, and manufacturers
          from around the world.
        </p>
  
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
          <div>
            <h3 className="text-2xl font-bold">10K+</h3>
            <p className="text-gray-400">Suppliers</p>
          </div>
  
          <div>
            <h3 className="text-2xl font-bold">120+</h3>
            <p className="text-gray-400">Countries</p>
          </div>
  
          <div>
            <h3 className="text-2xl font-bold">50K+</h3>
            <p className="text-gray-400">Products</p>
          </div>
  
          <div>
            <h3 className="text-2xl font-bold">24/7</h3>
            <p className="text-gray-400">Support</p>
          </div>
        </div>
      </div>
    );
  }