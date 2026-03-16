import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"
import { headers } from "next/headers"

export async function getServerApolloClient() {
  const headerStore = await headers()
  const protocol = headerStore.get("x-forwarded-proto") ?? "http"
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  if (!host) {
    throw new Error("Missing host header")
  }

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: `${protocol}://${host}/api/graphql`,
      headers: {
        cookie: headerStore.get("cookie") ?? "",
      },
      fetchOptions: { cache: "no-store" },
    }),
  })
}
