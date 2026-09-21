import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { ProductCard } from '../components/ProductCard';
import { Icons } from '../components/icons/Icons';
import { Button } from '../components/ui/Button';

const Wishlist = () => {
    const { products, wishlist } = useStore();
    const navigate = useNavigate();

    const wishlistedProducts = products.filter(product => wishlist.includes(product.id) && product.isVisible);

    if (wishlistedProducts.length === 0) {
        return (
            <div className="text-center py-8">
                <Icons.heart className="w-24 h-24 mx-auto text-gray-300" />
                <h2 className="mt-6 text-2xl font-bold text-gray-800">Your wishlist is empty</h2>
                <p className="mt-2 text-gray-500">Looks like you haven't added anything to your wishlist yet.</p>
                <Button onClick={() => navigate('/')} className="mt-6">Start Shopping</Button>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">My Wishlist</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-4 md:gap-6">
                {wishlistedProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
};

export default Wishlist;