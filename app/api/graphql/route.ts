import { createYoga } from "graphql-yoga"

import { createGraphQLContext } from "@/lib/graphql/context"
import { schema } from "@/lib/graphql/schema"

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  context: createGraphQLContext,
  fetchAPI: { Response },
})

export { yoga as GET, yoga as OPTIONS, yoga as POST }
