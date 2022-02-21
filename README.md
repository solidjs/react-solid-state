# React Solid State

[![Build Status](https://github.com/solidjs/react-solid-states/workflows/React%20Solid%20State%20CI/badge.svg)](https://github.com/solidjs/react-solid-state/actions/workflows/main-ci.yml)
[![NPM Version](https://img.shields.io/npm/v/react-solid-state.svg?style=flat)](https://www.npmjs.com/package/react-solid-state)
![](https://img.shields.io/librariesio/release/npm/react-solid-state)

This is a local state swap for React using [SolidJS](https://github.com/solidjs/solid). Instead of worrying about when your components should update you can use declarative data. This makes use of the new React Hooks API. However it differs in a few really key ways:
- Dependencies are automatically tracked. While there is an option to set explicit dependencies it is isn't necessary.
- Nested hooks are allowed. Effects that produce sub nested effects are fair game.

The goal here is to give as close as possible to Solid's easy state management and fine-grained dependency detection while still being able to use React. All of [Solid's API methods](https://www.solidjs.com/docs/latest/api) have been ported. Note: this uses React Hooks so it only works with Function Components which is consistent with how Components work in Solid.

There are a few differences in the Solid API from some React Hooks of the same name. Solid `Store`s are objects much like traditional React State. There is a `useCleanup` method that lets you register release code at both the component unmount level and in each Hook. `useEffect` doesn't expect a cleanup/dispose method returned for that reason. `useMemo` (and `useSignal`) return getters rather than the the pure value. This is because the context where data gets accessed is the key to automatic dependency tracking. For all the information of how Solid works, look at the [website](https://solidjs.com).

To get started, simply wrap your components in `withSolid` as a HOC, and have your Component return a Function with your JSX. From there use your hooks.

This package exports both direct Solid API named functions like `createEffect`, and `use`-prefixed ones. Solid isn't subject to the Hook rules, so it makes sense to use `create` prefixes, but if you want to use `use` you can.

```jsx
import { withSolid, createSignal } from 'react-solid-state'
import React from 'react'

const WelcomeComponent = withSolid(props => {
  const [recipient, setRecipient] = createSignal('John');
  return () => (<div onClick={() => setRecipient('Jake')}>
    Hello { recipient() }
  </div>);
})
```

Alternatively you can use the `useObserver` Hook instead:

```jsx
import { useObserver, createSignal, createEffect, onCleanup } from 'react-solid-state'
import React from 'react'

const CounterComponent = props => {
  const [count, setCount] = createSignal(0);
  createEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 1000);
    onCleanup(() => clearInterval(timer));
  })
  return useObserver(() => <div>{count()}</div>);
})
```
