import React from 'react';

export default function ProductList({ products }) {
  return (
    <div>
      {products.map((product) => (
        <div>{product.name}</div>
      ))}
      <button onClick={() => alert('Added!')}>Add to Cart</button>
      {typeof window !== 'undefined' && localStorage.getItem('theme')}
    </div>
  );
}