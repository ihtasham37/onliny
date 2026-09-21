import React, { useMemo, useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Icons } from '../../components/icons/Icons';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/helpers';
import { copyToClipboard as safeCopyToClipboard } from '../../utils/shareHelper';

export interface CustomerSummary {
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  city: string;
  province: string;
  lastOrderDate: number;
  firstOrderDate: number;
  statusList: string[];
}

export const ManageUserDetails: React.FC = () => {
  const { myOrders: orders, isLoading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Group and aggregate unique customers from real order submissions
  const customers = useMemo(() => {
    const map: Record<string, CustomerSummary> = {};

    orders.forEach(order => {
      // Clean identifier: phone or email or name
      const phoneClean = (order.customerPhone || '').trim();
      const emailClean = (order.email || '').trim().toLowerCase();
      const nameClean = (order.customerName || '').trim() || 'Anonymous Customer';

      // Use normalized phone as primary key, fallback to email or name
      const key = phoneClean || emailClean || nameClean.toLowerCase();
      if (!key) return;

      const orderAmount = Number(order.total) || 0;
      const orderDate = Number(order.createdAt) || Date.now();

      if (!map[key]) {
        map[key] = {
          name: nameClean,
          email: emailClean,
          phone: phoneClean,
          ordersCount: 1,
          totalSpent: orderAmount,
          city: (order.city || '').trim(),
          province: (order.province || '').trim(),
          lastOrderDate: orderDate,
          firstOrderDate: orderDate,
          statusList: [order.status]
        };
      } else {
        const item = map[key];
        item.ordersCount += 1;
        item.totalSpent += orderAmount;
        if (!item.email && emailClean) item.email = emailClean;
        if (!item.phone && phoneClean) item.phone = phoneClean;
        if (!item.city && order.city) item.city = order.city.trim();
        if (!item.province && order.province) item.province = order.province.trim();
        if (orderDate > item.lastOrderDate) {
          item.lastOrderDate = orderDate;
          if (nameClean && nameClean !== 'Anonymous Customer') item.name = nameClean;
        }
        if (orderDate < item.firstOrderDate) {
          item.firstOrderDate = orderDate;
        }
        if (!item.statusList.includes(order.status)) {
          item.statusList.push(order.status);
        }
      }
    });

    // Sort by latest order date descending
    return Object.values(map).sort((a, b) => b.lastOrderDate - a.lastOrderDate);
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.province.toLowerCase().includes(q)
    );
  }, [customers, searchTerm]);

  // CSV Excel Export feature
  const handleDownloadCSV = () => {
    if (customers.length === 0) {
      alert('No customer records found to export.');
      return;
    }

    const headers = [
      'Customer Name',
      'Phone Number',
      'Email Address',
      'Total Orders',
      'Total Spent (PKR)',
      'City',
      'Province',
      'First Order Date',
      'Last Order Date'
    ];

    const escapeCsvField = (val: string | number) => {
      const stringVal = String(val ?? '').replace(/"/g, '""');
      return `"${stringVal}"`;
    };

    const rows = customers.map(c => [
      escapeCsvField(c.name),
      escapeCsvField(c.phone),
      escapeCsvField(c.email || 'N/A'),
      escapeCsvField(c.ordersCount),
      escapeCsvField(c.totalSpent.toFixed(2)),
      escapeCsvField(c.city || 'N/A'),
      escapeCsvField(c.province || 'N/A'),
      escapeCsvField(new Date(c.firstOrderDate).toLocaleDateString()),
      escapeCsvField(new Date(c.lastOrderDate).toLocaleDateString())
    ]);

    // UTF-8 BOM so Microsoft Excel correctly displays Urdu/Arabic and phone numbers without scientific notation
    const csvContent = '\uFEFF' + [
      headers.map(escapeCsvField).join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `Zivio_Customer_Records_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await safeCopyToClipboard(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Icons.users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-800">User Details & Records</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real customer profiles saved automatically from every order with phone numbers, emails, and total spent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleDownloadCSV}
            disabled={customers.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-2 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <Icons.download className="w-4 h-4" />
            <span>Download Record (CSV / Excel)</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Unique Customers</span>
          <p className="text-2xl font-black text-slate-800 font-serif mt-1">{customers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Orders Placed</span>
          <p className="text-2xl font-black text-rose-600 font-serif mt-1">{orders.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Lifetime Order Value</span>
          <p className="text-2xl font-black text-amber-600 font-serif mt-1">
            {formatCurrency(customers.reduce((acc, curr) => acc + curr.totalSpent, 0))}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Icons.search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by customer name, phone number, email, or city..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
          >
            <Icons.x className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Customers Table / Card List */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
              <Icons.users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Customers Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? `No customer matches "${searchTerm}". Try searching by another name or phone number.`
                : 'Whenever customers place orders, their name, email, and phone number will be automatically cataloged here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">City / Area</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredCustomers.map((customer, index) => {
                  const phoneId = `phone-${index}`;
                  const emailId = `email-${index}`;
                  return (
                    <tr key={index} className="hover:bg-rose-50/30 transition-colors">
                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 text-white font-bold flex items-center justify-center text-xs shrink-0 aspect-square shadow-xs">
                            {customer.name[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="font-bold text-slate-900">{customer.name}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{customer.phone || '—'}</span>
                          {customer.phone && (
                            <button
                              onClick={() => copyToClipboard(customer.phone, phoneId)}
                              title="Copy phone"
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              {copiedField === phoneId ? (
                                <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>
                              ) : (
                                <Icons.copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-slate-600">
                        {customer.email ? (
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[180px]">{customer.email}</span>
                            <button
                              onClick={() => copyToClipboard(customer.email, emailId)}
                              title="Copy email"
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              {copiedField === emailId ? (
                                <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>
                              ) : (
                                <Icons.copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No email provided</span>
                        )}
                      </td>

                      {/* City */}
                      <td className="py-3 px-4 text-slate-600">
                        {customer.city ? (
                          <span>
                            {customer.city}
                            {customer.province ? `, ${customer.province}` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Orders Count */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                          {customer.ordersCount}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatCurrency(customer.totalSpent)}
                      </td>

                      {/* Last Order Date */}
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {new Date(customer.lastOrderDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUserDetails;
