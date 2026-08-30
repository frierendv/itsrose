import {
	act,
	fireEvent,
	render,
	renderHook,
	screen,
} from "@testing-library/react";
import { createRef } from "react";
import {
	Navbar,
	NavbarBrand,
	NavbarContent,
	NavbarItem,
	NavbarMenu,
	NavbarMenuItem,
	NavbarMenuToggle,
	NavbarRoot,
	useNavbar,
} from "../../../src/components/navbar";

describe("components/navbar", () => {
	describe("Navbar compound object", () => {
		it("has all compound subcomponents attached", () => {
			expect(Navbar.Root).toBe(NavbarRoot);
			expect(Navbar.Brand).toBe(NavbarBrand);
			expect(Navbar.Content).toBe(NavbarContent);
			expect(Navbar.Item).toBe(NavbarItem);
			expect(Navbar.Menu).toBe(NavbarMenu);
			expect(Navbar.MenuItem).toBe(NavbarMenuItem);
			expect(Navbar.MenuToggle).toBe(NavbarMenuToggle);
		});
	});

	describe("NavbarRoot", () => {
		it("renders correctly with default props", () => {
			const { container } = render(
				<NavbarRoot data-testid="navbar">
					<span>Content</span>
				</NavbarRoot>
			);

			const nav = screen.getByTestId("navbar");
			expect(nav.tagName).toBe("NAV");
			expect(nav).toHaveClass("navbar", "navbar--sticky");
			expect(nav).toHaveAttribute("data-menu-open", "false");

			const header = container.querySelector(".navbar--header");
			expect(header).toBeInTheDocument();
			expect(header).toHaveClass("navbar--header-xl");
			expect(header?.textContent).toBe("Content");
		});

		it("supports custom position, maxWidth, border, and blur", () => {
			render(
				<NavbarRoot
					data-testid="navbar"
					position="fixed"
					maxWidth="2xl"
					isBordered
					isBlured
				>
					<span>Header</span>
				</NavbarRoot>
			);

			const nav = screen.getByTestId("navbar");
			expect(nav).toHaveClass(
				"navbar",
				"navbar--fixed",
				"navbar--border",
				"navbar--blur"
			);

			const header = nav.querySelector(".navbar--header");
			expect(header).toHaveClass("navbar--header-2xl");
		});

		it("forwards ref to the DOM node", () => {
			const ref = createRef<HTMLElement>();
			render(
				<NavbarRoot ref={ref}>
					<span>Header</span>
				</NavbarRoot>
			);

			expect(ref.current).toBeInstanceOf(HTMLElement);
			expect(ref.current?.tagName).toBe("NAV");
		});

		it("supports polymorphic 'as' prop", () => {
			render(
				<NavbarRoot as="div" data-testid="custom-nav">
					<span>Div Nav</span>
				</NavbarRoot>
			);

			const element = screen.getByTestId("custom-nav");
			expect(element.tagName).toBe("DIV");
		});
	});

	describe("NavbarBrand", () => {
		it("renders brand with default div and class", () => {
			render(
				<NavbarBrand data-testid="brand" className="custom-brand">
					<span>Brand Name</span>
				</NavbarBrand>
			);

			const brand = screen.getByTestId("brand");
			expect(brand.tagName).toBe("DIV");
			expect(brand).toHaveClass("navbar--brand", "custom-brand");
			expect(brand.textContent).toBe("Brand Name");
		});

		it("supports polymorphic 'as' prop and forwards ref", () => {
			const ref = createRef<HTMLAnchorElement>();
			render(
				<NavbarBrand as="a" href="/" ref={ref} data-testid="brand-link">
					Logo
				</NavbarBrand>
			);

			const brand = screen.getByTestId("brand-link");
			expect(brand.tagName).toBe("A");
			expect(brand).toHaveAttribute("href", "/");
			expect(ref.current).toBe(brand);
		});
	});

	describe("NavbarContent", () => {
		it("renders content with default justify start and ul tag", () => {
			render(
				<NavbarContent data-testid="content">
					<li>Item 1</li>
				</NavbarContent>
			);

			const content = screen.getByTestId("content");
			expect(content.tagName).toBe("UL");
			expect(content).toHaveClass("navbar--content");
			expect(content).toHaveAttribute("data-justify", "start");
		});

		it("supports justify end and center", () => {
			const { rerender } = render(
				<NavbarContent data-testid="content" justify="end" />
			);
			expect(screen.getByTestId("content")).toHaveAttribute(
				"data-justify",
				"end"
			);

			rerender(<NavbarContent data-testid="content" justify="center" />);
			expect(screen.getByTestId("content")).toHaveAttribute(
				"data-justify",
				"center"
			);
		});

		it("forwards ref and supports custom 'as'", () => {
			const ref = createRef<HTMLDivElement>();
			render(
				<NavbarContent as="div" ref={ref} data-testid="content-div" />
			);

			const content = screen.getByTestId("content-div");
			expect(content.tagName).toBe("DIV");
			expect(ref.current).toBe(content);
		});
	});

	describe("NavbarItem", () => {
		it("renders li with navbar--item class", () => {
			render(
				<NavbarItem data-testid="item" className="custom-item">
					Item
				</NavbarItem>
			);

			const item = screen.getByTestId("item");
			expect(item.tagName).toBe("LI");
			expect(item).toHaveClass("navbar--item", "custom-item");
		});

		it("supports isActive prop", () => {
			const { rerender } = render(
				<NavbarItem data-testid="item" isActive={true} />
			);
			expect(screen.getByTestId("item")).toHaveAttribute(
				"data-active",
				"true"
			);

			rerender(<NavbarItem data-testid="item" isActive={false} />);
			expect(screen.getByTestId("item")).toHaveAttribute(
				"data-active",
				"false"
			);
		});

		it("forwards ref and supports custom 'as'", () => {
			const ref = createRef<HTMLDivElement>();
			render(<NavbarItem as="div" ref={ref} data-testid="item-div" />);

			expect(screen.getByTestId("item-div").tagName).toBe("DIV");
			expect(ref.current).toBe(screen.getByTestId("item-div"));
		});
	});

	describe("NavbarMenuItem", () => {
		it("renders within NavbarRoot context and sets data-active and data-menu-open", () => {
			render(
				<NavbarRoot isMenuOpen={true}>
					<NavbarMenuItem data-testid="menu-item" isActive={true}>
						Menu Item
					</NavbarMenuItem>
				</NavbarRoot>
			);

			const item = screen.getByTestId("menu-item");
			expect(item.tagName).toBe("LI");
			expect(item).toHaveClass("navbar--menu-item");
			expect(item).toHaveAttribute("data-active", "true");
			expect(item).toHaveAttribute("data-menu-open", "true");
		});

		it("forwards ref to element", () => {
			const ref = createRef<HTMLLIElement>();
			render(
				<NavbarRoot>
					<NavbarMenuItem ref={ref} data-testid="menu-item" />
				</NavbarRoot>
			);

			expect(ref.current).toBe(screen.getByTestId("menu-item"));
		});
	});

	describe("NavbarMenuToggle", () => {
		it("renders toggle button with sr-only label when closed", () => {
			render(
				<NavbarRoot isMenuDefaultOpen={false}>
					<NavbarMenuToggle data-testid="toggle" />
				</NavbarRoot>
			);

			const toggle = screen.getByTestId("toggle");
			expect(toggle.tagName).toBe("BUTTON");
			expect(toggle).toHaveClass("group");
			expect(toggle).toHaveAttribute("data-menu-open", "false");
			expect(
				screen.getByText("open navigation menu")
			).toBeInTheDocument();
		});

		it("toggles menu open state and updates sr-only label on click", () => {
			render(
				<NavbarRoot isMenuDefaultOpen={false}>
					<NavbarMenuToggle data-testid="toggle" />
				</NavbarRoot>
			);

			const toggle = screen.getByTestId("toggle");
			expect(toggle).toHaveAttribute("data-menu-open", "false");
			expect(
				screen.getByText("open navigation menu")
			).toBeInTheDocument();

			fireEvent.click(toggle);

			expect(toggle).toHaveAttribute("data-menu-open", "true");
			expect(
				screen.getByText("close navigation menu")
			).toBeInTheDocument();
		});

		it("supports custom children override", () => {
			render(
				<NavbarRoot>
					<NavbarMenuToggle data-testid="toggle">
						<span>Custom Icon</span>
					</NavbarMenuToggle>
				</NavbarRoot>
			);

			expect(screen.getByText("Custom Icon")).toBeInTheDocument();
		});

		it("forwards ref to button element", () => {
			const ref = createRef<HTMLButtonElement>();
			render(
				<NavbarRoot>
					<NavbarMenuToggle ref={ref} data-testid="toggle" />
				</NavbarRoot>
			);

			expect(ref.current).toBe(screen.getByTestId("toggle"));
		});
	});

	describe("NavbarMenu", () => {
		it("renders menu overlay when isMenuOpen is true", () => {
			render(
				<NavbarRoot isMenuOpen={true} isBlured height={64}>
					<NavbarMenu data-testid="menu">
						<li>Link 1</li>
					</NavbarMenu>
				</NavbarRoot>
			);

			const menu = screen.getByTestId("menu");
			expect(menu).toBeInTheDocument();
			expect(menu).toHaveClass("navbar--menu", "navbar--blur");
			expect(menu).toHaveAttribute("data-menu-open", "true");
			expect(menu.style.getPropertyValue("--navbar-height")).toBe("64px");
			expect(screen.getByText("Link 1")).toBeInTheDocument();
		});

		it("does not render menu overlay when isMenuOpen is false", () => {
			render(
				<NavbarRoot isMenuOpen={false}>
					<NavbarMenu data-testid="menu">
						<li>Link 1</li>
					</NavbarMenu>
				</NavbarRoot>
			);

			expect(screen.queryByTestId("menu")).not.toBeInTheDocument();
		});

		it("supports string height in css property", () => {
			render(
				<NavbarRoot isMenuOpen={true} height="5rem">
					<NavbarMenu data-testid="menu">
						<li>Link</li>
					</NavbarMenu>
				</NavbarRoot>
			);

			const menu = screen.getByTestId("menu");
			expect(menu.style.getPropertyValue("--navbar-height")).toBe("5rem");
		});
	});

	describe("useNavbar hook", () => {
		it("handles default options", () => {
			const { result } = renderHook(() => useNavbar({}));

			expect(result.current.height).toBe("4rem");
			expect(result.current.isMenuOpen).toBe(false);
			expect(result.current.isBordered).toBe(false);
			expect(result.current.isBlured).toBe(false);
		});

		it("handles controlled open state with onMenuOpenChange callback", () => {
			const onMenuOpenChange = jest.fn();
			const { result } = renderHook(() =>
				useNavbar({
					isMenuOpen: false,
					onMenuOpenChange,
				})
			);

			expect(result.current.isMenuOpen).toBe(false);

			act(() => {
				result.current.setIsMenuOpen(true);
			});

			expect(onMenuOpenChange).toHaveBeenCalledWith(true);
		});

		it("handles isMenuDefaultOpen in uncontrolled mode", () => {
			const { result } = renderHook(() =>
				useNavbar({
					isMenuDefaultOpen: true,
				})
			);

			expect(result.current.isMenuOpen).toBe(true);

			act(() => {
				result.current.setIsMenuOpen(false);
			});

			expect(result.current.isMenuOpen).toBe(false);
		});
	});
});
