# `@itsrose/react`

React UI components, layout primitives, and hooks for the ItsRose platform.

## Installation

```bash
pnpm add @itsrose/react
```

## Setup Styles

Import the component stylesheet in your global CSS:

```css
@import "@itsrose/react/styles";
```

## Usage

### Navbar

```tsx
import { Navbar } from "@itsrose/react";

export function Header() {
	return (
		<Navbar>
			<Navbar.Brand>
				<span className="font-bold">ItsRose</span>
			</Navbar.Brand>

			<Navbar.Content>
				<Navbar.Item>
					<a href="/dashboard">Dashboard</a>
				</Navbar.Item>
				<Navbar.Item isActive>
					<a href="/settings">Settings</a>
				</Navbar.Item>
			</Navbar.Content>

			<Navbar.MenuToggle />

			<Navbar.Menu>
				<Navbar.MenuItem>
					<a href="/profile">Profile</a>
				</Navbar.MenuItem>
			</Navbar.Menu>
		</Navbar>
	);
}
```

### Hooks

```tsx
import { useIsMobile } from "@itsrose/react";

export function ResponsiveView() {
	const isMobile = useIsMobile();

	return <div>{isMobile ? "Mobile View" : "Desktop View"}</div>;
}
```

### Core Primitives

```tsx
import { cn, createContext, forwardRef, tv } from "@itsrose/react/core";

// Typed context helper
const [ThemeProvider, useTheme] = createContext<{ theme: string }>({
	name: "ThemeContext",
});

// Polymorphic forwardRef
const Card = forwardRef<"div">((props, ref) => {
	const { as: Component = "div", className, ...rest } = props;
	return (
		<Component
			ref={ref}
			className={cn("p-4 border rounded", className)}
			{...rest}
		/>
	);
});
```
