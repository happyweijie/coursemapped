import { Check, Plus } from 'lucide-react';
import { addToBasket, keyId, removeFromBasket, toBasketKey, useBasket } from '../lib/basket';
import type { MappingRow } from '../lib/types';

/** Add/remove toggle shown next to each mapping in search results. */
export default function BasketButton({ row }: { row: MappingRow }) {
  const basket = useBasket();
  const key = toBasketKey(row);
  const inBasket = basket.some((k) => keyId(k) === keyId(key));
  return inBasket ? (
    <button type="button" className="btn btn-ghost" onClick={() => removeFromBasket(key)}>
      <Check size={14} /> Added
    </button>
  ) : (
    <button type="button" className="btn btn-accent" onClick={() => addToBasket([key])}>
      <Plus size={14} /> Basket
    </button>
  );
}
