import Link from "next/link";
import { ArrowUpRight, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupplierForProduct } from "@/lib/marketplace/data";
import type { Product } from "@/lib/marketplace/types";
import CountryFlag from "./CountryFlag";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const supplier = getSupplierForProduct(product);

  return (
    <Card className="rounded-lg border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
      </div>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className="mb-2 rounded-md">
              {product.category}
            </Badge>
            <CardTitle className="line-clamp-2 text-lg">{product.name}</CardTitle>
          </div>
          <PackageCheck className="mt-1 size-5 shrink-0 text-neutral-500" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-neutral-600">{supplier?.companyName ?? "Verified supplier"}</div>
        <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3 text-sm">
          <CountryFlag country={product.country} />
          <span className="font-medium text-neutral-950">MOQ {product.moq}</span>
        </div>
      </CardContent>
      <CardFooter className="justify-between bg-white">
        <span className="text-sm text-neutral-500">{product.packaging}</span>
        <Button asChild size="sm">
          <Link href={`/products/${product.id}`}>
            Details
            <ArrowUpRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
