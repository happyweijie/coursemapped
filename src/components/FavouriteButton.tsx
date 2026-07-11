import { Star } from 'lucide-react';
import { toggleFavourite, useFavourites } from '../lib/favourites';

/** Star toggle for a partner university, shown in every group header. */
export default function FavouriteButton({ university }: { university: string }) {
  const favourites = useFavourites();
  const active = favourites.includes(university);
  const label = active
    ? `Remove ${university} from favourites`
    : `Add ${university} to favourites`;
  return (
    <button
      type="button"
      className={`fav-btn${active ? ' fav-btn-active' : ''}`}
      onClick={() => toggleFavourite(university)}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      <Star size={18} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}
