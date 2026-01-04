// components/RouteWrapper.tsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Tenant, Permission } from '../types';

interface RouteWrapperProps {
    component: React.ComponentType<any>;
    currentUser: User | null;
    permissions: Set<Permission>;
    tenants: Tenant[];
    users: User[];
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
    [key: string]: any; // Allow for other props passed to the wrapped component
}

const RouteWrapper: React.FC<RouteWrapperProps> = ({
    component: Component,
    currentUser,
    permissions,
    tenants,
    users,
    setNotification,
    ...rest
}) => {
    const navigate = useNavigate();
    const params = useParams();

    // Adapter for legacy onNavigate calls
    const handleNavigate = (view: string, param?: string) => {
        if (view === 'farmer-details') navigate(`/farmers/${param}`);
        else if (view === 'product-list') navigate(`/marketplace/category/${param}`);
        else if (view === 'order-confirmation') navigate(`/marketplace/order/${param}`);
        else navigate(`/${view}`);
    };

    const handleBack = () => navigate(-1);

    // Merge params into props so components can access IDs (e.g. farmerId)
    const mergedProps = { ...rest, ...params };

    return (
        <Component
            {...mergedProps}
            currentUser={currentUser}
            permissions={permissions}
            tenants={tenants}
            users={users}
            setNotification={setNotification}
            onNavigate={handleNavigate}
            onBack={handleBack}
        />
    );
};

export default RouteWrapper;
