interface FakeFetchArgs {
  readonly originalFetch: typeof fetch
  readonly handler: (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => ReturnType<typeof fetch>
}

export function createTypedFakeFetch({
  originalFetch,
  handler,
}: FakeFetchArgs): typeof fetch {
  return Object.assign(
    (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1]
    ) => handler(input, init),
    originalFetch
  ) as typeof fetch
}
