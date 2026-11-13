# Developer Setup Doctor

[![CI](https://github.com/AtaraxyDevelopers/dev-setup-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/AtaraxyDevelopers/dev-setup-doctor/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Diagnose project setup problems with actionable, secret-safe checks.

An open-source project from [Ataraxy Developers](https://github.com/AtaraxyDevelopers).

## Quick start

Requires Node.js 22 or 24 and npm. Git is optional if you download the source ZIP.

```sh
git clone https://github.com/AtaraxyDevelopers/dev-setup-doctor.git
cd dev-setup-doctor
npm ci
npm test
```

Run the included healthy configuration:

```sh
npm run demo
node src/cli.mjs --config examples/doctor.json --json
```

Copy `examples/web-app.json` to your project's `doctor.json` and adapt the checks.
Run the CLI from that project's root, or use `npm link` in this repository to make
the `setup-doctor` command available locally. This package is distributed through
GitHub; it is not currently published to the npm registry.

## Configuration

| Field       | Meaning                                           |
| ----------- | ------------------------------------------------- |
| nodeMajors  | Accepted Node.js major versions                   |
| files       | Required files, relative to the current directory |
| env         | Required nonempty process environment variables   |
| ports       | Ports that must be available on 127.0.0.1         |
| connections | Objects containing name, host, and TCP port       |

All fields are optional arrays; unknown keys fail validation. Environment values
are never printed. Dotenv files are not loaded implicitly: Node's
`--env-file=.env` option can load one explicitly. Exit codes are 0 for passing,
1 for failed checks, and 2 for invalid configuration or arguments.

## Scope and limitations

TCP reachability does not verify database credentials, schemas, TLS, or application
health. Port checks are IPv4 loopback checks and reflect a point in time. The tool
only diagnoses; it does not modify settings, install software, or stop processes.
Avoid secrets in connection names and filenames because those labels are displayed.

## Testing

Tests open temporary loopback sockets and verify occupied ports, unavailable
services, configuration validation, CLI exit codes, and secret-safe output.

## Contributing and support

See [CONTRIBUTING.md](CONTRIBUTING.md), [community expectations](CODE_OF_CONDUCT.md),
and [SECURITY.md](SECURITY.md). Open an issue with a minimal synthetic reproduction.
This project is maintained on a best-effort basis. No paid service or account is
required to run the local examples.

## License

[MIT](LICENSE). You may use, adapt, and redistribute this project under its license.
