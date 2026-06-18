{
  description = "Development environment for a Tauri + React M3U editor";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    rust-overlay.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      rust-overlay,
    }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      forAllSystems =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          f (
            import nixpkgs {
              inherit system;
              overlays = [ rust-overlay.overlays.default ];
            }
          )
        );
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            (rust-bin.stable.latest.default.override {
              extensions = [
                "rust-src"
                "rustfmt"
                "clippy"
              ];
            })

            nodejs_22
            pnpm

            pkg-config
            openssl

            # Tauri Linux dependencies.
            at-spi2-atk
            atkmm
            cairo
            gdk-pixbuf
            glib
            gtk3
            harfbuzz
            libsoup_3
            pango
            webkitgtk_4_1
            libayatana-appindicator
            librsvg

            mesa
          ];

          env = {
            RUST_BACKTRACE = "1";
            PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
            LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
              pkgs.at-spi2-atk
              pkgs.atkmm
              pkgs.cairo
              pkgs.gdk-pixbuf
              pkgs.glib
              pkgs.gtk3
              pkgs.libsoup_3
              pkgs.webkitgtk_4_1
              pkgs.libayatana-appindicator
              pkgs.librsvg
              pkgs.mesa
            ];
            LIBGL_DRIVERS_PATH = "${pkgs.mesa}/lib/dri";
          };

          shellHook = ''
            echo "m3u-editor dev shell"
            echo "Rust: $(rustc --version)"
            echo "Node: $(node --version)"
            echo "pnpm: $(pnpm --version)"
          '';
        };
      });
    };
}
