import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {      
      const productAlreadyExist = cart.find(product => product.id === productId);
      if(productAlreadyExist) {
        const { amount: productAmount } = productAlreadyExist;

        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        const productIsAvailableInStock = stock.amount > productAmount;

        if (!productIsAvailableInStock) {
          toast.error('Quantidade solicitada fora de estoque');

          return;
        }

        const updateProductAmount = cart.map(product => {
          return product.id === productId 
          ? {
              ...product,
              amount: productAmount + 1
            } : product;
        });

        setCart(updateProductAmount);

        localStorage.setItem('@RocketShoes:cart', 
          JSON.stringify(updateProductAmount)
        )
        return;
      }

      const { data: productData } = await api.get<Product>(`products/${productId}`);
      const newProductInCart = [...cart , {...productData, amount: 1 }];
      setCart(newProductInCart);

      localStorage.setItem('@RocketShoes:cart', 
        JSON.stringify(newProductInCart)
      )
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const productAlreadyExist = cart.find(product => product.id === productId);

      if(!productAlreadyExist) {
        throw Error();
      }
  
      const filteredCart = cart.filter(product => product.id !== productId);
      setCart(filteredCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredCart));
    } catch { 
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      if(stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productAlreadyExists = cart.find(
        product => product.id === productId
      );

      if (!productAlreadyExists) throw Error();

      const updateProductAmount = cart.map( product => product.id === productId ?
        {
          ...product,
          amount,
        } : product
      );
      
      setCart(updateProductAmount);

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(updateProductAmount)
      );

    } catch {
      toast.error('Erro na alteração de quantidade do produto');    
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
