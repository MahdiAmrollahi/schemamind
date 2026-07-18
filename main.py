import matplotlib.pyplot as plt
import networkx as nx

G = nx.read_graphml("schema_graph.graphml")
nx.draw(G, with_labels=True)
plt.show()