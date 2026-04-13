import SubscriptionContent from "@/components/SubscriptionContent";
import React, { Suspense } from "react";

const SubscriptionsPage = () => {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl">
        <Suspense fallback={<div>Loading subscriptions...</div>}>
          <SubscriptionContent />
        </Suspense>
      </div>
    </main>
  );
};

export default SubscriptionsPage;
