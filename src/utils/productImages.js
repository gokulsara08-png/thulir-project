// Default and preset product image utilities for Thulir Marketplace

export const DEFAULT_PRODUCT_IMAGES = {
  'Compost': 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=600&q=80',
  'Fertilizer': 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80',
  'Recycled Plastic': 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80',
  'Recycled Paper': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
  'Recycled Glass': 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80',
  'Recycled Metal': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80',
  'Bio Products': 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
  'Other': 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80'
};

export const PRESET_PRODUCT_IMAGES = [
  { label: 'Organic Compost / Soil', category: 'Compost', url: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=600&q=80' },
  { label: 'Bio Fertilizer Gold', category: 'Fertilizer', url: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80' },
  { label: 'Recycled Plastic Planter', category: 'Recycled Plastic', url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80' },
  { label: 'Recycled Paper Notebook', category: 'Recycled Paper', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Recycled Glass Vase', category: 'Recycled Glass', url: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80' },
  { label: 'Recycled Metal Craft', category: 'Recycled Metal', url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80' },
  { label: 'Eco Bio Bag / Tote', category: 'Bio Products', url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80' },
  { label: 'Bamboo & Wood Craft', category: 'Other', url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80' }
];

/**
 * Returns a valid image URL for a product, falling back to a category-specific default image
 */
export function getProductImage(product) {
  if (product && typeof product.image === 'string' && product.image.trim() !== '') {
    return product.image;
  }
  if (product && product.category && DEFAULT_PRODUCT_IMAGES[product.category]) {
    return DEFAULT_PRODUCT_IMAGES[product.category];
  }
  return DEFAULT_PRODUCT_IMAGES['Other'];
}
