import React, { useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { OrderStatus } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { Icons } from '../../components/icons/Icons';
import { Spinner } from '../../components/ui/Spinner';

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string }) => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 flex items-center gap-4 border border-gray-100">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-md font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { myProducts: products, myOrders: orders, isLoading } = useStore();

    const stats = useMemo(() => {
        const totalRevenue = orders
            .filter(o => o.status === OrderStatus.Delivered)
            .reduce((sum, o) => sum + o.total, 0);
        
        const pendingOrders = orders.filter(o => o.status === OrderStatus.Pending).length;
        const completedOrders = orders.filter(o => o.status === OrderStatus.Delivered).length;

        return {
            totalRevenue,
            totalProducts: products.length,
            pendingOrders,
            completedOrders,
        };
    }, [orders, products]);
    
    if (isLoading && orders.length === 0) {
        return <div className="flex justify-center p-16"><Spinner size="lg"/></div>
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Revenue" 
                    value={formatCurrency(stats.totalRevenue)} 
                    icon={Icons.dollarSign}
                    color="bg-green-500"
                />
                 <StatCard 
                    title="Total Products" 
                    value={stats.totalProducts} 
                    icon={Icons.package}
                    color="bg-blue-500"
                />
                 <StatCard 
                    title="Pending Orders" 
                    value={stats.pendingOrders} 
                    icon={Icons.shoppingCart}
                    color="bg-yellow-500"
                />
                 <StatCard 
                    title="Completed Orders" 
                    value={stats.completedOrders} 
                    icon={Icons.shoppingCart}
                    color="bg-pink-500"
                />
            </div>
            
            <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-3">Recent Orders</h2>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-3">Customer</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.slice(0, 5).map(order => (
                                <tr key={order.id} className="border-b">
                                    <td className="p-3">{order.customerName}</td>
                                    <td className="p-3 font-medium">{formatCurrency(order.total)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            order.status === OrderStatus.Delivered ? 'bg-green-100 text-green-800' :
                                            order.status === OrderStatus.Cancelled ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>{order.status}</span>
                                    </td>
                                    <td className="p-3 text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

export default Dashboard;