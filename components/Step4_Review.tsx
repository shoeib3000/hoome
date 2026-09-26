import React from 'react';
import type { PropertyListing } from '../types';
import ListingPreview from './ListingPreview';

interface Step4ReviewProps {
  data: PropertyListing;
}

const Step4Review: React.FC<Step4ReviewProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">بازبینی و ثبت نهایی</h2>
          <p className="text-gray-600 mt-2">
            این پیش‌نمایش آگهی شماست. لطفا تمام اطلاعات را با دقت بررسی کنید. در صورت تایید، دکمه "ثبت نهایی آگهی" را بزنید.
          </p>
      </div>
      
      {/* Show preview only on mobile, as it's on the side for desktop */}
      <div className="lg:hidden mt-8 border-t pt-6">
         <ListingPreview data={data} />
      </div>

       {/* Show a confirmation message on desktop */}
      <div className="hidden lg:flex flex-col items-center justify-center text-center p-8 bg-green-50 border border-green-200 rounded-lg min-h-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-xl font-semibold text-green-800">شما در مرحله آخر هستید!</h3>
          <p className="mt-1 text-green-700">لطفا اطلاعات را از پیش‌نمایش سمت چپ بازبینی کرده و آگهی خود را ثبت کنید.</p>
      </div>
    </div>
  );
};

export default Step4Review;
