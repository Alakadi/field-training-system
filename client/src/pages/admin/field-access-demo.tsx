import React from 'react';
import AdminLayout from '@/components/layout/admin-layout';
import FieldAccessDemo from '@/components/admin/field-access-demo';

const FieldAccessDemoPage: React.FC = () => {
  return (
    <AdminLayout>
      <FieldAccessDemo />
    </AdminLayout>
  );
};

export default FieldAccessDemoPage;