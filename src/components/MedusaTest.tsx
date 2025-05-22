import { useEffect, useState } from 'react'
import { medusaClient } from '../lib/medusa'

interface Product {
  id: string
  title: string
  description?: string
  handle?: string
  is_giftcard: boolean
  status: string
  thumbnail?: string
}

export default function MedusaTest() {
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { products } = await medusaClient.products.list()
        setProducts(
          products
            .filter((p) => typeof p.id === "string" && typeof p.title === "string" && typeof p.is_giftcard === "boolean" && typeof p.status === "string")
            .map((p) => ({
              id: p.id as string,
              title: p.title ?? '',
              description: p.description ?? '',
              handle: p.handle ?? '',
              is_giftcard: p.is_giftcard ?? false,
              status: p.status ?? '',
              thumbnail: p.thumbnail ?? '',
            }))
        )
      } catch (err: any) {
        setError(err.message)
        console.error('Error fetching products:', err)
      }
    }

    fetchProducts()
  }, [])

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div>
      <h2>Products</h2>
      {products.length === 0 ? (
        <p>No products found</p>
      ) : (
        <ul>
          {products.map((product) => (
            <li key={product.id}>{product.title}</li>
          ))}
        </ul>
      )}
    </div>
  )
} 