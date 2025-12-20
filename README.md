# Enei

Your choice if envoy feels too heavy for the task. 
Mostly used as ambassador container in Kubernetes, but runs everywhere. Based on Bun >1.3, zero dependencies, daily used to save lives at [Schutz & Rettung Zurich](https://github.com/Schutz-Rettung-Zurich/). 

## Why?

This container can be dropped into a Kubernetes Deployment and act as a middleware between the service and the pod. It will by default print all the requests and their responses to stdout. This way you can watch it with `kubectl logs` or do whatever you do with them, for example forward to Grafana Loki.

Basically it makes what `socat -v TCP4-LISTEN:42144,reuseaddr,fork TCP4:localhost:42118` does but in a nice formatted way.

## Features

- Masks Bearer, X-Api-Key, Basic Auth, X-Token (but not fully).

## Config

| ENV-Variable | Description | Default / Notes |
|---------|-------------|-----------------|
| `PORT` | Listener port | `42144` |
| `ENEI_DESTINATION` | Destination URL. You can also specify protocol and port here. | `https://postman-echo.com` |
| `ENEI_LOG_IGNORE` | Regex on `URL.pathname` to ignore in log output. Enei will forward traffic to `/health` to the `ENEI_DESTINATION` server. Use `/enei/health` to check Enei itself. | `^\/health(z?)$` |
| `ENEI_LOG_COLORIZE` | Colorize log in terminal | `true` |
| `ENEI_LOG_STATUSCODE_STDERR` | Output to stderr if HTTP response code is > 300 | `false` |
| `ENEI_LOG_FORWARD` | Print request | `true` |
| `ENEI_LOG_FORWARD_HEADERS` | Print request headers | `false` |
| `ENEI_LOG_FORWARD_BODY` | Print request body | `false` |
| `ENEI_LOG_FORWARD_BODY_CAP` | Cap request body to char count | `1024` |
| `ENEI_LOG_BACKWARD` | Print response | `true` |
| `ENEI_LOG_BACKWARD_HEADERS` | Print response headers | `false` |
| `ENEI_LOG_BACKWARD_BODY` | Print response body | `false` |
| `ENEI_LOG_BACKWARD_BODY_CAP` | Cap response body to char count | `1024` |
| `ENEI_HEADER_FORWARD_INJECT_1/_2/_3` | Inject or overwrite request headers (`Key: Value`); can also remove headers; commonly used for API keys | ` ` |
| `ENEI_HEADER_BACKWARD_INJECT_1/_2/_3` | See above | ` ` |
| `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` | Proxy configuration, supported natively by Bun | ` ` |


If you have special SSL-Certs, mount them to the file system on path `/config/cafile.crt` (you can add multiple to the same file) and Bun will read it (as set in `bunfig.tmol`). If you prefer you can also set the path via `NODE_EXTRA_CA_CERTS`.


## Running it

### Example Kubernetes configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  selector:
    matchLabels:
      app: myapp
  replicas: 1
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: request-logging-ambassador
        image: ghcr.io/martinschilliger/enei:latest
        pullPolicy: IfNotPresent      # Like always recommended for producation use
        ports:
          - containerPort: 42144
        env:
          - name: "BUN_PORT"          # Specify where we should listen and configure yourapp to point to http://localhost:42144
            value: 42144
          - name: "ENEI_DESTINATION"   # Specify your endpoint, can also be an external host like https://postman-echo.com
            value: "http://localhost:42118"
          - name: HTTP_PROXY
            value: "http://proxy.corporate.local:8080"
          - name: HTTPS_PROXY
            value: "http://proxy.corporate.local:8080"
          - name: NO_PROXY
            value: "localhost,.corporate.local"
          - name: ENEI_LOG_FORWARD_BODY
            value: "true"
          - name: ENEI_LOG_BACKWARD_BODY
            value: "true"
        volumeMounts:
          - mountPath: /config/cafile.crt
            name: internal-root-ca
            subPath: COMPANY-ROOT-CA.crt
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
      - name: myapp
        image: yourregistry/yourapp:latest
        ports:
          - containerPort: 42118
      dnsPolicy: ClusterFirst
      imagePullSecrets:
      - name: rescuetrack
      volumes:
      - configMap:
          name: internal-root-ca
        name: internal-root-ca

```

### Testing it locally

Assuming you already have a container runtime working on your machine:

```bash
docker build -t ghcr.io/martinschilliger/enei:latest .
docker run -it -p 42144:42144 --rm ghcr.io/martinschilliger/enei:latest
```

Now open http://localhost:42144 in your favorite browser. You will see the GET request of it. If you want to see body data, access the container with curl:

```bash
curl -X POST "http://localhost:42144/post?foo=bar" -d '{"blubb":"blabb"}' -H "Content-Type: application/json"
```

If you don't supply a `ENEI_DESTINATION` we will just mirror your data.

### TODO

The following features could be nice to have, but have not yet been implemented:

- [ ] Mask sensitive headers, such as `X-API-KEY` in the log
- [ ] It always uses `Bun/1.3.4` as UserAgent, I don't know why
- [ ] Supply custom headers, eg. to inject auth tokens
- [ ] Supply network delays or random failures for testing

And there is also some code cleanup needed:

- [ ] Move `process.env.XZY === "true"` to a solid `Boolean` test function

## Development

### Install dependencies

Nothing to do. There are no dependencies, it's all plain Bun 🥳. 

~~> bun install~~

### Run locally

```bash
bun run index.ts
```

### Run tests
```bash
bun test
```

## Imprint

At Schutz & Rettung Zürich we are running the dispatch center for medical and fire fighting emergencies. Most of our newer applications run in Kubernetes and need to be high available and fully transparent about what they are doing. Because if something goes wrong during an emergency call, we need to make shure the same mistake cannot happen twice. 

![Logo of Schutz & Rettung Zürich](https://github.com/Schutz-Rettung-Zurich/.github/raw/main/profile/logo_SRZ.png)

We often had the need to replay \*exactly* what has happend, so request and response body are important. And because we run the service for our own staff only and on promise privacy is already handled.

We thought about using tools like `envoy` or basic `socat`, but we also wanted the log to be nicely formatted because we forward them to Grafana Loki, our centralized log storage.