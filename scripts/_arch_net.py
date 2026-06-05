# One-off: One Edu network-topology diagram (Microsoft VNet/subnet style, Azure icons).
from diagrams import Diagram, Cluster, Edge
from diagrams.azure.network import (
    VirtualNetworkGateways, DDOSProtectionPlans, ApplicationGateway,
    Firewall, LoadBalancers,
)
from diagrams.azure.web import AppServices
from diagrams.azure.devops import AzureDevops, Pipelines
from diagrams.azure.database import SQLDatabases
from diagrams.azure.security import KeyVaults
from diagrams.azure.general import Usericon
from diagrams.onprem.network import Internet

graph_attr = {
    "fontsize": "22", "bgcolor": "white", "pad": "0.7",
    "splines": "spline", "nodesep": "0.6", "ranksep": "1.25", "labelloc": "t",
}
node_attr = {"fontsize": "12"}
edge_attr = {"fontsize": "11", "color": "#41607F"}

vnet_attr = {"bgcolor": "#FFFFFF", "pencolor": "#3B82C4", "style": "dashed,rounded",
             "penwidth": "2.2", "fontsize": "15", "fontcolor": "#1F3A5F"}
subnet_attr = {"bgcolor": "#EAF1F8", "pencolor": "#A9C4E0", "style": "rounded", "fontsize": "12"}
onprem_attr = {"bgcolor": "#FFFFFF", "pencolor": "#3B82C4", "style": "dashed,rounded", "fontsize": "12"}

with Diagram(
    "One Edu  —  Azure Network Topology  (single region)",
    filename="docs/images/azure-architecture-network",
    outformat=["png", "svg"],
    direction="LR",
    show=False,
    graph_attr=graph_attr, node_attr=node_attr, edge_attr=edge_attr,
):
    # ---- left: on-prem + public ----
    with Cluster("On-premises network  ·  192.168.0.0/16", graph_attr=onprem_attr):
        emp = Usericon("Staff / Admin")
        onpremgw = VirtualNetworkGateways("Gateway")

    cust = Usericon("Parents / Students")
    inet = Internet("Internet")
    ddos = DDOSProtectionPlans("DDoS Protection")

    # ---- right: managed services reached via service endpoint / private link ----
    devops = AzureDevops("Azure DevOps\n/ GitHub")
    sql = SQLDatabases("Azure SQL Database")

    # ---- the VNet ----
    with Cluster("Azure Virtual Network  ·  10.0.0.0/16", graph_attr=vnet_attr):

        with Cluster("Gateway subnet  ·  10.0.255.224/27", graph_attr=subnet_attr):
            vpngw = VirtualNetworkGateways("VPN Gateway")

        with Cluster("Application Gateway subnet  ·  10.0.3.0/24", graph_attr=subnet_attr):
            waf = Firewall("Web Application\nFirewall")
            l7 = ApplicationGateway("L7 load balancer")

        with Cluster("Web tier subnet  ·  10.0.1.0/24", graph_attr=subnet_attr):
            ilb = LoadBalancers("ILB")
            app = AppServices("App Service\n(SSR + API)")

        with Cluster("CI/CD subnet  ·  10.0.2.0/24", graph_attr=subnet_attr):
            agent = Pipelines("CI/CD agent")

        with Cluster("Data subnet (Private Endpoints)  ·  10.0.4.0/24", graph_attr=subnet_attr):
            kv = KeyVaults("Key Vault")

    # ---- flows ----
    emp >> onpremgw >> Edge(label="ExpressRoute /\nsite-to-site VPN") >> vpngw
    vpngw >> Edge() >> ilb
    cust >> Edge() >> inet >> Edge() >> waf
    ddos >> Edge(style="dotted", color="#9AA7B4") >> waf
    waf >> Edge() >> l7 >> Edge() >> ilb
    ilb >> Edge() >> app
    devops >> Edge() >> agent
    agent >> Edge(label="deploy") >> app
    app >> Edge(label="Virtual network\nservice endpoint") >> sql
    app >> Edge(label="private endpoint") >> kv
