# JM Estate Compass and RouteOS — visible doorway v2.2A

This Android body continues from the frozen RouteOS Estate Shelf Route v2.1A at commit `2af4683bf2783901775e6b972ebbaded77e5a603`.

## Result

- The frozen v2.1A Estate Shelf is bundled as the default first-launch body.
- A permanent native ROUTEOS control opens the shelf, Five Crowns, or the Sovereign Estate Router.
- The user does not need to remember package names, URI schemes, or cartridge identifiers.
- Imported Compass HTML still mounts into app storage and can be restored or removed.
- Removing a mounted body returns to the built-in RouteOS shelf.

## Native identities

- Compass package: `com.jmestate.estatecompass`
- RouteOS package: `com.jmisjustme.routeos.gameestate`
- Routes: `jmrouteos://cartridge/five-crowns` and `jmrouteos://cartridge/estate-router`

## Build route

The project uses Android Gradle Plugin 8.7.3, Gradle 8.9, Java 17, compileSdk 35, targetSdk 35, and Compass minSdk 26. CI builds unsigned release APKs and verifies Android zip alignment.

## Boundary

This checkpoint proves a visible Compass doorway and a paired build-and-inspection route for Compass and RouteOS. It does not combine the two applications into one package, perform store publication, or claim physical-device behaviour before device testing.
