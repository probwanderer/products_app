import {
  Card,
  Page,
  Layout,
  Image,
  Link,
  Text,
  DataTable,
  LegacyCard,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation, Trans } from "react-i18next";
import { debounce } from "lodash";
import { useState,useCallback, useDebugValue, useEffect } from "react";
import { useAppQuery,useAuthenticatedFetch } from "../hooks";
export default function HomePage() {
  const [isLoading,setIsLoading]= useState(true);
  const [priceRange,setPriceRange]= useState({
    min:0,
    max:100000
  });
const {
  data,
  isLoading:isLoadingCount,
  isRefetching: isRefetchingCount,
} = useAppQuery({
  url: `/api/products`,
  reactQueryOptions: {
    refetchOnReconnect: false,
  },
});


const  rows=isLoadingCount?[]:data.map(element=>{var a=[]; a.push(element.TITLE,element.PRICE?parseFloat(element.PRICE):0,element.RATING,element.DESCRIPTION); return a;});
const [data1,setData1] = useState(rows);
useEffect(() => {
  const newData1 = rows.filter(element => element[1] >= priceRange.min && element[1] <= priceRange.max);
  setData1(newData1);
}, [priceRange, rows]);


const handleMinPriceChange = debounce((event) => {
  const minPrice = parseInt(event);
  setPriceRange(prevRange => ({ ...prevRange, min: minPrice }));
},300);

const handleMaxPriceChange =  debounce((event) => {
  const maxPrice = parseInt(event);
  setPriceRange(prevRange => ({ ...prevRange, max: maxPrice }));
},300);
//  ()=>
// {
//   setLprice=value
//   data1=data1.filter(element=>{element.PRICE>=lprice&&element.PRICE<=hprice});

// }
  const { t } = useTranslation();

  return (
    <Page >
      <TitleBar title={t("HomePage.title")} primaryAction={null} />
      <Layout>
        <Layout.Section>
        <TextField type="number"
  label="Lowest Price"
  value={priceRange.min}
  onChange={handleMinPriceChange}
  autoComplete="off"
/> <TextField
  label="Highest Price"
  value={priceRange.max}
  onChange={handleMaxPriceChange}
  autoComplete="off"
/>
        </Layout.Section>
        <Layout.Section>
          <LegacyCard>
          
          <Text variant="bodyMd" as="p" fontWeight="semibold">
          
           {isLoadingCount?"-":
           <DataTable
          columnContentTypes={[
            'text',
            'numeric',
            'numeric',
            'text',
            
          ]}
          headings={[
            'Product',
            'Price',
            'Rating',
            'Description',
            
          ]}
          rows={data1}
          
        />}
          </Text>

          </LegacyCard>
        </Layout.Section>
       
      </Layout>
    </Page>
  );
}
