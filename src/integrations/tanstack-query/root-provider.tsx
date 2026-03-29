import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";

const sharedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

export function getContext() {
  return {
    queryClient: sharedQueryClient,
  };
}

export function Provider(props) {
  const client = props.queryClient ?? sharedQueryClient;

  return (
    <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
  );
}
