import React from "react";
import { Product, Price } from "../types";

interface ProductCardProps {
  product: Product;
  onBuy: (price: Price) => void;
}

const ProductCard = ({ product, onBuy }: ProductCardProps) => {
  const price = product.prices[0]; // Assuming there's only one price per product

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount / 100); // Stripe amounts are in cents
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-xl transition-colors backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex-1">
          <h2 className="mb-1 text-lg font-semibold text-foreground">
            {product.name}
          </h2>
          <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
          <div>
            <span className="text-xl font-bold text-foreground">
              {formatPrice(price.unit_amount, price.currency)}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">
              /
              {price.interval_count > 1
                ? `${price.interval_count} ${price.interval}s`
                : price.interval}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={() => onBuy(price)}
            className="whitespace-nowrap rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Subscribe Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
