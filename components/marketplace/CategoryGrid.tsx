const categories = [
  "Food",
  "Machinery",
  "Electronics",
  "Textiles",
  "Metals",
  "Chemicals",
];

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-10">
      {categories.map((category) => (
        <div
          key={category}
          className="bg-white border rounded-2xl p-6 shadow hover:shadow-lg transition cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
        </div>
      ))}
    </div>
  );
}
